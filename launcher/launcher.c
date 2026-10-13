// frametube: starts the Electron binary next to it (frametube-electron) without the libraries Steam injects into
// games. Steam on the Frame starts apps with LD_PRELOAD (its overlay) and LD_LIBRARY_PATH (its runtime's pinned
// libraries); with both, Chromium's zygote dies at start ("Zygote process exited prematurely") before any app code
// runs. Everything else (display, controllers, Steam's ids) is passed on unchanged.
//
// Fully static and freestanding (raw syscalls, own _start): no libc needed to build or run it.

typedef unsigned long size_t;

#define AT_FDCWD (-100)
#define TARGET "frametube-electron"

#if defined(__aarch64__)
#define SYS_readlinkat 78
#define SYS_write 64
#define SYS_execve 221
#define SYS_exit_group 94

static long sys3(long n, long a, long b, long c) {
    register long x8 __asm__("x8") = n;
    register long x0 __asm__("x0") = a;
    register long x1 __asm__("x1") = b;
    register long x2 __asm__("x2") = c;
    __asm__ volatile("svc 0" : "+r"(x0) : "r"(x8), "r"(x1), "r"(x2) : "memory");
    return x0;
}

static long sys4(long n, long a, long b, long c, long d) {
    register long x8 __asm__("x8") = n;
    register long x0 __asm__("x0") = a;
    register long x1 __asm__("x1") = b;
    register long x2 __asm__("x2") = c;
    register long x3 __asm__("x3") = d;
    __asm__ volatile("svc 0" : "+r"(x0) : "r"(x8), "r"(x1), "r"(x2), "r"(x3) : "memory");
    return x0;
}

__asm__(".text\n.global _start\n_start:\n  mov x29, #0\n  mov x0, sp\n  bl start_c\n");
#elif defined(__x86_64__)  // for testing the launcher on a PC
#define SYS_readlinkat 267
#define SYS_write 1
#define SYS_execve 59
#define SYS_exit_group 231

static long sys3(long n, long a, long b, long c) {
    long ret;
    __asm__ volatile("syscall" : "=a"(ret) : "a"(n), "D"(a), "S"(b), "d"(c) : "rcx", "r11", "memory");
    return ret;
}

static long sys4(long n, long a, long b, long c, long d) {
    long ret;
    register long r10 __asm__("r10") = d;
    __asm__ volatile("syscall" : "=a"(ret) : "a"(n), "D"(a), "S"(b), "d"(c), "r"(r10) : "rcx", "r11", "memory");
    return ret;
}

__asm__(".text\n.global _start\n_start:\n  xor %rbp, %rbp\n  mov %rsp, %rdi\n  and $-16, %rsp\n  call start_c\n");
#else
#error "aarch64 or x86_64 only"
#endif

static size_t len(const char *s) {
    size_t n = 0;
    while (s[n]) n++;
    return n;
}

static int starts_with(const char *s, const char *prefix) {
    while (*prefix)
        if (*s++ != *prefix++) return 0;
    return 1;
}

static void fail(const char *what) {
    const char *msg = "frametube: couldn't start " TARGET ": ";
    sys3(SYS_write, 2, (long)msg, (long)len(msg));
    sys3(SYS_write, 2, (long)what, (long)len(what));
    sys3(SYS_write, 2, (long)"\n", 1);
    sys3(SYS_exit_group, 127, 0, 0);
}

__attribute__((used, noreturn)) void start_c(long *sp) {
    long argc = sp[0];
    char **argv = (char **)(sp + 1);
    char **envp = argv + argc + 1;

    // the program's own folder, from /proc/self/exe (not argv[0], which Steam may pass as a relative or bare name)
    static char path[4096];
    long n = sys4(SYS_readlinkat, AT_FDCWD, (long)"/proc/self/exe", (long)path, sizeof(path) - sizeof(TARGET) - 1);
    if (n <= 0) fail("can't read /proc/self/exe");
    long slash = n - 1;
    while (slash >= 0 && path[slash] != '/') slash--;
    const char *target = TARGET;
    long i = slash + 1;
    for (const char *t = target; *t; t++) path[i++] = *t;
    path[i] = 0;

    // drop Steam's injected libraries; the environment block on the stack is ours to rearrange
    char **out = envp;
    for (char **e = envp; *e; e++)
        if (!starts_with(*e, "LD_PRELOAD=") && !starts_with(*e, "LD_LIBRARY_PATH=")) *out++ = *e;
    *out = 0;

    sys3(SYS_execve, (long)path, (long)argv, (long)envp);
    fail(path);
    __builtin_unreachable();
}
