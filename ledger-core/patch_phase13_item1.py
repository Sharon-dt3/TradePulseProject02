import pathlib

base = pathlib.Path("src/main/java/com/tradepulse/ledgercore")

# 1. OrderService.java interface
p = base / "service/OrderService.java"
src = p.read_text()
old = (
    "     * @param userId  the caller, taken from jwt.sub — this is also who\n"
    "     *                owns the account the order is placed against, since\n"
    "     *                Phase 3 has no delegated-trading concept yet.\n"
    "     * @throws AccountNotFoundException if userId has no account\n"
    "     */\n"
    "    OrderResultDto placeOrder(UUID userId, OrderRequestDto request);\n"
    "\n"
    "    /**\n"
    "     * Every order the caller's account has ever placed, newest first.\n"
    "     *\n"
    "     * @throws AccountNotFoundException if userId has no account\n"
    "     */\n"
    "    List<OrderResultDto> listOrders(UUID userId);\n"
)
assert src.count(old) == 1, "OrderService.java: marker not found or not unique"
new = (
    "     * @param roles   the caller's roles (jwt \"user_role\" claim), checked\n"
    "     *                against {@code orders.create} before anything else\n"
    "     * @param userId  the caller, taken from jwt.sub — this is also who\n"
    "     *                owns the account the order is placed against, since\n"
    "     *                Phase 3 has no delegated-trading concept yet.\n"
    "     * @throws AccountNotFoundException if userId has no account\n"
    "     */\n"
    "    OrderResultDto placeOrder(List<String> roles, UUID userId, OrderRequestDto request);\n"
    "\n"
    "    /**\n"
    "     * Every order the caller's account has ever placed, newest first.\n"
    "     *\n"
    "     * @param roles the caller's roles (jwt \"user_role\" claim), checked\n"
    "     *              against {@code orders.read.own} before anything else\n"
    "     * @throws AccountNotFoundException if userId has no account\n"
    "     */\n"
    "    List<OrderResultDto> listOrders(List<String> roles, UUID userId);\n"
)
src = src.replace(old, new)
p.write_text(src)
print("OrderService.java patched")

# 2. OrderServiceImpl.java
p = base / "service/OrderServiceImpl.java"
src = p.read_text()

old = '    private static final String ORDER_CANCEL_PERMISSION = "orders.cancel.own";'
assert src.count(old) == 1, "OrderServiceImpl.java: permission constant marker not found or not unique"
new = (
    '    private static final String ORDER_CREATE_PERMISSION = "orders.create";\n'
    '    private static final String ORDER_READ_PERMISSION = "orders.read.own";\n'
    '    private static final String ORDER_CANCEL_PERMISSION = "orders.cancel.own";'
)
src = src.replace(old, new)

old = (
    "    @Override\n"
    "    public OrderResultDto placeOrder(UUID userId, OrderRequestDto request) {\n"
    "        validateLimitFields(request);\n"
)
assert src.count(old) == 1, "OrderServiceImpl.java: placeOrder marker not found or not unique"
new = (
    "    @Override\n"
    "    public OrderResultDto placeOrder(List<String> roles, UUID userId, OrderRequestDto request) {\n"
    "        permissionService.requirePermission(roles, ORDER_CREATE_PERMISSION);\n"
    "        validateLimitFields(request);\n"
)
src = src.replace(old, new)

old = (
    "    @Override\n"
    "    public List<OrderResultDto> listOrders(UUID userId) {\n"
    "        Account account = accountService.getAccountForUser(userId)\n"
)
assert src.count(old) == 1, "OrderServiceImpl.java: listOrders marker not found or not unique"
new = (
    "    @Override\n"
    "    public List<OrderResultDto> listOrders(List<String> roles, UUID userId) {\n"
    "        permissionService.requirePermission(roles, ORDER_READ_PERMISSION);\n"
    "        Account account = accountService.getAccountForUser(userId)\n"
)
src = src.replace(old, new)
p.write_text(src)
print("OrderServiceImpl.java patched")

# 3. OrderController.java
p = base / "web/OrderController.java"
src = p.read_text()
old = (
    '    @PostMapping("/orders")\n'
    "    public ResponseEntity<OrderResultDto> placeOrder(\n"
    "            @Valid @RequestBody OrderRequestDto request,\n"
    "            Authentication authentication) {\n"
    "        Jwt jwt = (Jwt) authentication.getPrincipal();\n"
    "        UUID userId = UUID.fromString(jwt.getSubject());\n"
    "\n"
    "        OrderResultDto result = orderService.placeOrder(userId, request);\n"
    "        return ResponseEntity.status(HttpStatus.CREATED).body(result);\n"
    "    }\n"
    "\n"
    '    @GetMapping("/orders")\n'
    "    public ResponseEntity<List<OrderResultDto>> listOrders(Authentication authentication) {\n"
    "        Jwt jwt = (Jwt) authentication.getPrincipal();\n"
    "        UUID userId = UUID.fromString(jwt.getSubject());\n"
    "\n"
    "        return ResponseEntity.ok(orderService.listOrders(userId));\n"
    "    }\n"
)
assert src.count(old) == 1, "OrderController.java: marker not found or not unique"
new = (
    '    @PostMapping("/orders")\n'
    "    public ResponseEntity<OrderResultDto> placeOrder(\n"
    "            @Valid @RequestBody OrderRequestDto request,\n"
    "            Authentication authentication) {\n"
    "        Jwt jwt = (Jwt) authentication.getPrincipal();\n"
    "        UUID userId = UUID.fromString(jwt.getSubject());\n"
    '        List<String> roles = jwt.getClaimAsStringList("user_role");\n'
    "\n"
    "        OrderResultDto result = orderService.placeOrder(roles, userId, request);\n"
    "        return ResponseEntity.status(HttpStatus.CREATED).body(result);\n"
    "    }\n"
    "\n"
    '    @GetMapping("/orders")\n'
    "    public ResponseEntity<List<OrderResultDto>> listOrders(Authentication authentication) {\n"
    "        Jwt jwt = (Jwt) authentication.getPrincipal();\n"
    "        UUID userId = UUID.fromString(jwt.getSubject());\n"
    '        List<String> roles = jwt.getClaimAsStringList("user_role");\n'
    "\n"
    "        return ResponseEntity.ok(orderService.listOrders(roles, userId));\n"
    "    }\n"
)
src = src.replace(old, new)
p.write_text(src)
print("OrderController.java patched")

# 4. AccountService.java
p = base / "service/AccountService.java"
src = p.read_text()

old = "import java.util.Optional;\nimport java.util.UUID;"
assert src.count(old) == 1, "AccountService.java: import marker not found or not unique"
new = "import java.util.List;\nimport java.util.Optional;\nimport java.util.UUID;"
src = src.replace(old, new)

old = "    Optional<Account> getAccountForUser(UUID userId);\n}"
assert src.count(old) == 1, "AccountService.java: method marker not found or not unique"
new = (
    "    Optional<Account> getAccountForUser(UUID userId);\n"
    "\n"
    "    /**\n"
    "     * Same ownership resolution as getAccountForUser, but gated behind\n"
    "     * {@code account.read.own} first. getAccountForUser itself stays\n"
    "     * permission-free because other services (OrderServiceImpl,\n"
    "     * PortfolioServiceImpl, LedgerTransactionServiceImpl) reuse it purely\n"
    "     * as an internal ownership lookup - the permission check for those\n"
    "     * call sites already lives on their own outward-facing action (e.g.\n"
    "     * positions.read.own), so gating getAccountForUser itself would\n"
    "     * double-check unrelated permissions. This method is the one the\n"
    "     * controller calls for the actual \"read my account\" action.\n"
    "     */\n"
    "    Optional<Account> getMyAccount(List<String> roles, UUID userId);\n"
    "}"
)
src = src.replace(old, new)
p.write_text(src)
print("AccountService.java patched")

# 5. AccountServiceImpl.java
p = base / "service/AccountServiceImpl.java"
src = p.read_text()

old = "import java.util.Optional;\nimport java.util.UUID;\n\n@Service"
assert src.count(old) == 1, "AccountServiceImpl.java: import marker not found or not unique"
new = "import java.util.List;\nimport java.util.Optional;\nimport java.util.UUID;\n\n@Service"
src = src.replace(old, new)

old = (
    "public class AccountServiceImpl implements AccountService {\n"
    "\n"
    "    private final AccountRepository accountRepository;\n"
    "\n"
    "    public AccountServiceImpl(AccountRepository accountRepository) {\n"
    "        this.accountRepository = accountRepository;\n"
    "    }\n"
    "\n"
    "    @Override\n"
    "    public Optional<Account> getAccountForUser(UUID userId) {\n"
    "        return accountRepository.findByUserId(userId);\n"
    "    }\n"
    "}"
)
assert src.count(old) == 1, "AccountServiceImpl.java: class body marker not found or not unique"
new = (
    "public class AccountServiceImpl implements AccountService {\n"
    "\n"
    '    private static final String ACCOUNT_READ_PERMISSION = "account.read.own";\n'
    "\n"
    "    private final AccountRepository accountRepository;\n"
    "    private final PermissionService permissionService;\n"
    "\n"
    "    public AccountServiceImpl(AccountRepository accountRepository, PermissionService permissionService) {\n"
    "        this.accountRepository = accountRepository;\n"
    "        this.permissionService = permissionService;\n"
    "    }\n"
    "\n"
    "    @Override\n"
    "    public Optional<Account> getAccountForUser(UUID userId) {\n"
    "        return accountRepository.findByUserId(userId);\n"
    "    }\n"
    "\n"
    "    @Override\n"
    "    public Optional<Account> getMyAccount(List<String> roles, UUID userId) {\n"
    "        permissionService.requirePermission(roles, ACCOUNT_READ_PERMISSION);\n"
    "        return getAccountForUser(userId);\n"
    "    }\n"
    "}"
)
src = src.replace(old, new)
p.write_text(src)
print("AccountServiceImpl.java patched")

# 6. AccountController.java
p = base / "web/AccountController.java"
src = p.read_text()

old = (
    "import org.springframework.http.ResponseEntity;\n"
    "import org.springframework.security.oauth2.jwt.Jwt;\n"
    "import org.springframework.web.bind.annotation.GetMapping;\n"
    "import org.springframework.web.bind.annotation.RestController;\n"
    "\n"
    "import java.util.UUID;\n"
)
assert src.count(old) == 1, "AccountController.java: import marker not found or not unique"
new = (
    "import org.springframework.http.ResponseEntity;\n"
    "import org.springframework.security.core.Authentication;\n"
    "import org.springframework.security.oauth2.jwt.Jwt;\n"
    "import org.springframework.web.bind.annotation.GetMapping;\n"
    "import org.springframework.web.bind.annotation.RestController;\n"
    "\n"
    "import java.util.List;\n"
    "import java.util.UUID;\n"
)
src = src.replace(old, new)

old = (
    '    @GetMapping("/accounts/me")\n'
    "    public ResponseEntity<AccountResponse> getMyAccount(\n"
    "            org.springframework.security.core.Authentication authentication) {\n"
    "        Jwt jwt = (Jwt) authentication.getPrincipal();\n"
    "        UUID userId = UUID.fromString(jwt.getSubject());\n"
    "\n"
    "        return accountService.getAccountForUser(userId)\n"
    "                .map(AccountResponse::from)\n"
    "                .map(ResponseEntity::ok)\n"
    "                .orElseGet(() -> ResponseEntity.notFound().build());\n"
    "    }\n"
)
assert src.count(old) == 1, "AccountController.java: method marker not found or not unique"
new = (
    '    @GetMapping("/accounts/me")\n'
    "    public ResponseEntity<AccountResponse> getMyAccount(Authentication authentication) {\n"
    "        Jwt jwt = (Jwt) authentication.getPrincipal();\n"
    "        UUID userId = UUID.fromString(jwt.getSubject());\n"
    '        List<String> roles = jwt.getClaimAsStringList("user_role");\n'
    "\n"
    "        return accountService.getMyAccount(roles, userId)\n"
    "                .map(AccountResponse::from)\n"
    "                .map(ResponseEntity::ok)\n"
    "                .orElseGet(() -> ResponseEntity.notFound().build());\n"
    "    }\n"
)
src = src.replace(old, new)
p.write_text(src)
print("AccountController.java patched")

print("\nAll files patched successfully.")
