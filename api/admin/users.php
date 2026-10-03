<?php
require_once __DIR__ . '/../../config/helpers.php';
requireAdmin();
header('Content-Type: application/json');

$db = getDB();

$search = trim($_GET['q'] ?? '');
$role = trim($_GET['role'] ?? '');
$status = trim($_GET['status'] ?? '');
$department = trim($_GET['department'] ?? '');
$banned = trim($_GET['banned'] ?? '');
$online = trim($_GET['online'] ?? '');
$joinedFrom = trim($_GET['from'] ?? '');
$joinedTo = trim($_GET['to'] ?? '');

$sortWhitelist = [
    'name' => 'name',
    'role' => 'role',
    'status' => 'status',
    'department' => 'department',
    'created_at' => 'created_at',
    'last_seen_at' => 'last_seen_at',
    'posts' => 'post_count',
];
$sort = isset($sortWhitelist[$_GET['sort'] ?? '']) ? $sortWhitelist[$_GET['sort']] : 'created_at';
$dir = strtolower($_GET['dir'] ?? 'desc') === 'asc' ? 'ASC' : 'DESC';

$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = (int) ($_GET['per_page'] ?? 10);
$perPage = max(5, min(50, $perPage));
$offset = ($page - 1) * $perPage;

$where = ['1 = 1'];
$params = [];

if ($search !== '') {
    $where[] = '(name LIKE ? OR email LIKE ? OR student_id LIKE ?)';
    $like = "%$search%";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}
if (in_array($role, ['student', 'faculty', 'guest', 'admin'], true)) {
    $where[] = 'role = ?';
    $params[] = $role;
}
if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
    $where[] = 'status = ?';
    $params[] = $status;
}
if ($department !== '') {
    $where[] = 'department = ?';
    $params[] = $department;
}
if ($banned === 'banned') {
    $where[] = 'is_banned = 1';
} elseif ($banned === 'clean') {
    $where[] = 'is_banned = 0';
}
if ($online === '1') {
    $where[] = 'is_online = 1';
} elseif ($online === '0') {
    $where[] = 'is_online = 0';
}
if ($joinedFrom !== '') {
    $where[] = 'created_at >= ?';
    $params[] = $joinedFrom . ' 00:00:00';
}
if ($joinedTo !== '') {
    $where[] = 'created_at <= ?';
    $params[] = $joinedTo . ' 23:59:59';
}

$whereSql = implode(' AND ', $where);

$countStmt = $db->prepare("SELECT COUNT(*) FROM users WHERE $whereSql");
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();

$sql = "
    SELECT u.id, u.name, u.email, u.student_id, u.department, u.role, u.avatar,
           u.about, u.is_online, u.status, u.created_at, u.last_seen_at,
           u.is_banned, u.banned_reason, u.banned_until,
           (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) AS post_count,
           (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id) AS comment_count,
           (SELECT COUNT(*) FROM reports r JOIN posts p2 ON p2.id = r.post_id WHERE p2.user_id = u.id) AS report_count
    FROM users u
    WHERE $whereSql
    ORDER BY $sort $dir, u.id DESC
    LIMIT $perPage OFFSET $offset
";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$users = $stmt->fetchAll();

foreach ($users as &$u) {
    $u['time'] = timeAgo($u['last_seen_at'] ?: $u['created_at']);
    $u['is_banned'] = (int) $u['is_banned'];
    $u['is_online'] = (int) $u['is_online'];
    $u['post_count'] = (int) $u['post_count'];
    $u['comment_count'] = (int) $u['comment_count'];
    $u['report_count'] = (int) $u['report_count'];
}
unset($u);

$facetSql = "SELECT role, status, department, is_banned, is_online, COUNT(*) c FROM users GROUP BY role, status, department, is_banned, is_online";
$facets = ['roles' => [], 'statuses' => [], 'departments' => [], 'banned' => 0, 'online' => 0, 'total' => 0];
foreach ($db->query($facetSql)->fetchAll() as $row) {
    $count = (int) $row['c'];
    $facets['roles'][$row['role']] = ($facets['roles'][$row['role']] ?? 0) + $count;
    $facets['statuses'][$row['status']] = ($facets['statuses'][$row['status']] ?? 0) + $count;
    if (!empty($row['department'])) {
        $facets['departments'][$row['department']] = ($facets['departments'][$row['department']] ?? 0) + $count;
    }
    if ($row['is_banned']) $facets['banned'] += $count;
    if ($row['is_online']) $facets['online'] += $count;
    $facets['total'] += $count;
}
ksort($facets['departments']);
ksort($facets['roles']);
ksort($facets['statuses']);

jsonResponse([
    'success' => true,
    'users' => $users,
    'total' => $total,
    'page' => $page,
    'per_page' => $perPage,
    'pages' => (int) ceil($total / $perPage),
    'facets' => $facets,
]);
