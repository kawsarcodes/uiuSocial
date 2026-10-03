<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$id = (int) ($_GET['id'] ?? 0);
if (!$id) jsonResponse(['error' => 'Club id required'], 400);
$db = getDB();
$stmt = $db->prepare("SELECT c.*, u.name AS owner_name, u.id AS owner_user_id FROM clubs c LEFT JOIN users u ON u.id = c.owner_id WHERE c.id = ?");
$stmt->execute([$id]);
$club = $stmt->fetch();
if (!$club) jsonResponse(['error' => 'Club not found'], 404);

$tags = $db->prepare("SELECT tag FROM club_tags WHERE club_id = ?");
$tags->execute([$id]);
$club['tags'] = array_column($tags->fetchAll(), 'tag');
$acts = $db->prepare("SELECT activity FROM club_activities WHERE club_id = ?");
$acts->execute([$id]);
$club['activities'] = array_column($acts->fetchAll(), 'activity');

$me = getCurrentUserId();
$mem = $db->prepare("SELECT role FROM club_members WHERE club_id = ? AND user_id = ?");
$mem->execute([$id, $me]);
$row = $mem->fetch();
$club['membership'] = $row['role'] ?? 'none';
$club['is_manager'] = isClubManager($id);
$club['members'] = (int) $club['members_count'];
$club['coverColor'] = $club['cover_color'];
$club['iconBg'] = $club['icon_bg'];

jsonResponse(['success' => true, 'club' => $club]);
