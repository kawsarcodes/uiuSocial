<?php
require_once __DIR__ . '/../../config/helpers.php';
requireAdmin();
header('Content-Type: application/json');

$db = getDB();

$status = in_array($_GET['status'] ?? '', ['pending', 'reviewed', 'dismissed'], true) ? $_GET['status'] : 'pending';
$reason = trim($_GET['reason'] ?? '');
$search = trim($_GET['q'] ?? '');

$where = ['r.status = ?'];
$params = [$status];

if ($reason !== '') {
    $where[] = 'r.reason = ?';
    $params[] = $reason;
}
if ($search !== '') {
    $where[] = '(p.content LIKE ? OR u.name LIKE ? OR a.name LIKE ?)';
    $like = "%$search%";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$rows = $db->prepare("
    SELECT r.*, p.content AS post_content, p.image AS post_image, p.user_id AS post_author_id,
           u.name AS reporter_name, a.name AS author_name
    FROM reports r
    JOIN posts p ON p.id = r.post_id
    JOIN users u ON u.id = r.reported_by
    JOIN users a ON a.id = p.user_id
    WHERE " . implode(' AND ', $where) . "
    ORDER BY r.created_at DESC
");
$rows->execute($params);
$reports = $rows->fetchAll();

foreach ($reports as &$r) {
    $r['time'] = timeAgo($r['created_at']);
    $r['author_banned'] = 0;
}
unset($r);

$authorIds = array_values(array_unique(array_map(fn($r) => (int) $r['post_author_id'], $reports)));
if ($authorIds) {
    $ph = implode(',', array_fill(0, count($authorIds), '?'));
    $banned = $db->prepare("SELECT id FROM users WHERE is_banned = 1 AND id IN ($ph)");
    $banned->execute($authorIds);
    $bannedSet = array_flip(array_map(fn($r) => (int) $r['id'], $banned->fetchAll()));
    foreach ($reports as &$r) {
        $r['author_banned'] = isset($bannedSet[(int) $r['post_author_id']]) ? 1 : 0;
    }
    unset($r);
}

$breakdown = [];
foreach ($db->query("SELECT reason, COUNT(*) c FROM reports WHERE status = 'pending' GROUP BY reason")->fetchAll() as $row) {
    $breakdown[$row['reason']] = (int) $row['c'];
}

jsonResponse(['success' => true, 'reports' => $reports, 'status' => $status, 'breakdown' => $breakdown]);
