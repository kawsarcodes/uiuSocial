<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');
$id = (int)($_GET['id'] ?? 0);
if (!$id) jsonResponse(['error' => 'Group ID required'], 400);
$db = getDB();
$stmt = $db->prepare("SELECT g.*, u.name AS creator_name FROM groups_table g LEFT JOIN users u ON u.id = g.created_by WHERE g.id = ?");
$stmt->execute([$id]);
$group = $stmt->fetch();
if (!$group) jsonResponse(['error' => 'Group not found'], 404);
$me = getCurrentUserId();
$mem = $db->prepare("SELECT gm.role, gm.user_id, u.name, u.avatar, u.department FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ?");
$mem->execute([$id]);
$members = $mem->fetchAll();
$isManager = isGroupManager($id) || isGroupModerator();
jsonResponse(['success' => true, 'group' => array_merge($group, ['members' => $members, 'is_manager' => $isManager])]);
