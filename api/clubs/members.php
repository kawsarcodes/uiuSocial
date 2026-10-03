<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');
$id = (int)($_GET['id'] ?? 0);
if (!$id) jsonResponse(['error' => 'Club ID required'], 400);
$db = getDB();
$stmt = $db->prepare("SELECT c.*, u.name AS owner_name, u.id AS owner_user_id FROM clubs c LEFT JOIN users u ON u.id = c.owner_id WHERE c.id = ?");
$stmt->execute([$id]);
$club = $stmt->fetch();
if (!$club) jsonResponse(['error' => 'Club not found'], 404);
$me = getCurrentUserId();
$mem = $db->prepare("SELECT u.id, u.name, u.avatar, u.role, u.department, cm.role AS member_role FROM club_members cm JOIN users u ON u.id = cm.user_id WHERE cm.club_id = ?");
$mem->execute([$id]);
$club['members'] = $mem->fetchAll();
jsonResponse(['success' => true, 'club' => $club]);
