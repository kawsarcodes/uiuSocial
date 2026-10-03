<?php
require_once __DIR__ . '/../../config/helpers.php';
requireAdmin();
header('Content-Type: application/json');

$db = getDB();

$limit = (int) ($_GET['limit'] ?? 50);
$limit = max(1, min(200, $limit));
$offset = max(0, (int) ($_GET['offset'] ?? 0));
$action = trim($_GET['action'] ?? '');
$targetType = trim($_GET['target_type'] ?? '');
$search = trim($_GET['q'] ?? '');

$where = ['1 = 1'];
$params = [];

if ($action !== '') {
    $where[] = 'l.action = ?';
    $params[] = $action;
}
if ($targetType !== '') {
    $where[] = 'l.target_type = ?';
    $params[] = $targetType;
}
if ($search !== '') {
    $where[] = '(l.details LIKE ? OR u.name LIKE ?)';
    $like = "%$search%";
    $params[] = $like;
    $params[] = $like;
}

$whereSql = implode(' AND ', $where);
$from = "FROM admin_logs l LEFT JOIN users u ON u.id = l.admin_id WHERE $whereSql";

$countStmt = $db->prepare("SELECT COUNT(*) $from");
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();

$stmt = $db->prepare("
    SELECT l.id, l.admin_id, l.action, l.target_type, l.target_id, l.details, l.created_at,
           u.name AS admin_name, u.avatar AS admin_avatar
    $from
    ORDER BY l.created_at DESC, l.id DESC
    LIMIT $limit OFFSET $offset
");
$stmt->execute($params);
$logs = $stmt->fetchAll();
foreach ($logs as &$l) {
    $l['time'] = timeAgo($l['created_at']);
    $l['target_name'] = adminLogTargetName($db, $l['target_type'], (int) $l['target_id']);
}
unset($l);

$actions = array_map(fn($r) => $r['action'], $db->query("SELECT DISTINCT action FROM admin_logs ORDER BY action")->fetchAll());

jsonResponse([
    'success' => true,
    'logs' => $logs,
    'total' => $total,
    'limit' => $limit,
    'offset' => $offset,
    'has_more' => ($offset + count($logs)) < $total,
    'actions' => $actions,
]);
