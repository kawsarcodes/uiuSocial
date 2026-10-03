<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$db = getDB();
$me = getCurrentUserId();
$user = getCurrentUser();
$groups = $db->query("SELECT g.*, u.name AS creator_name FROM groups_table g LEFT JOIN users u ON u.id = g.created_by ORDER BY g.created_at DESC")->fetchAll();

$mem = $db->prepare("SELECT group_id, role FROM group_members WHERE user_id = ?");
$mem->execute([$me]);
$map = [];
foreach ($mem->fetchAll() as $row) {
    $map[$row['group_id']] = $row['role'];
}

foreach ($groups as &$g) {
    $role = $map[$g['id']] ?? null;
    $g['membership'] = $role ?: 'none';
    $g['is_enrolled'] = $role && $role !== 'requested';
    $g['is_manager'] = isAdmin($user) || ((int) $g['created_by'] === (int) $me);
    $cnt = $db->prepare("SELECT COUNT(*) c FROM group_members WHERE group_id = ? AND role != 'requested'");
    $cnt->execute([$g['id']]);
    $g['members_count'] = (int) $cnt->fetch()['c'];
}
unset($g);

jsonResponse(['success' => true, 'groups' => $groups]);
