<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$db = getDB();
$me = getCurrentUserId();
$includePending = isset($_GET['all']) && isAdmin();

$sql = "SELECT id, name, email, student_id, department, role, avatar, cover_photo, about, is_online, status, created_at
        FROM users WHERE role != 'guest'";
if (!$includePending) {
    $sql .= " AND status = 'approved'";
}
$sql .= " ORDER BY name ASC";
$users = $db->query($sql)->fetchAll();

$sent = $db->prepare("SELECT connected_user_id, status FROM connections WHERE user_id = ?");
$sent->execute([$me]);
$sentMap = [];
foreach ($sent->fetchAll() as $row) {
    $sentMap[$row['connected_user_id']] = $row['status'];
}
$recv = $db->prepare("SELECT user_id, status FROM connections WHERE connected_user_id = ?");
$recv->execute([$me]);
$recvMap = [];
foreach ($recv->fetchAll() as $row) {
    $recvMap[$row['user_id']] = $row['status'];
}

foreach ($users as &$u) {
    $u['connection'] = 'none';
    if ((int) $u['id'] === (int) $me) {
        $u['connection'] = 'self';
    } elseif (isset($sentMap[$u['id']]) && $sentMap[$u['id']] === 'accepted') {
        $u['connection'] = 'connected';
    } elseif (isset($recvMap[$u['id']]) && $recvMap[$u['id']] === 'accepted') {
        $u['connection'] = 'connected';
    } elseif (isset($sentMap[$u['id']]) && $sentMap[$u['id']] === 'pending') {
        $u['connection'] = 'sent';
    } elseif (isset($recvMap[$u['id']]) && $recvMap[$u['id']] === 'pending') {
        $u['connection'] = 'incoming';
    }
}
unset($u);

jsonResponse(['success' => true, 'users' => $users]);
