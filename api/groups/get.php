<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$id = (int) ($_GET['id'] ?? 0);
if (!$id) jsonResponse(['error' => 'Group id required'], 400);

$db = getDB();
$stmt = $db->prepare("SELECT g.*, u.name AS creator_name, u.avatar AS creator_avatar FROM groups_table g LEFT JOIN users u ON u.id = g.created_by WHERE g.id = ?");
$stmt->execute([$id]);
$group = $stmt->fetch();
if (!$group) jsonResponse(['error' => 'Group not found'], 404);

$me = getCurrentUserId();
$mem = $db->prepare("SELECT gm.role, gm.user_id, u.name, u.avatar, u.department FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ?");
$mem->execute([$id]);
$members = $mem->fetchAll();
$myRole = 'none';
foreach ($members as $m) {
    if ((int) $m['user_id'] === (int) $me) $myRole = $m['role'];
}

$pending = array_values(array_filter($members, fn($m) => $m['role'] === 'requested'));
$active = array_values(array_filter($members, fn($m) => $m['role'] !== 'requested'));

$group['membership'] = $myRole;
$group['is_enrolled'] = $myRole !== 'none' && $myRole !== 'requested';
$group['is_manager'] = isGroupManager($id);
$canModerate = $group['is_manager'] || isGroupModerator();
$group['is_moderator'] = $canModerate;
$group['members'] = $active;
$group['join_requests'] = $canModerate ? $pending : [];
$group['members_count'] = count($active);

jsonResponse(['success' => true, 'group' => $group]);
