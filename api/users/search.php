<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');
$q = trim($_GET['q'] ?? '');
if (strlen($q) < 2) jsonResponse(['success' => true, 'users' => []]);
$db = getDB();
$stmt = $db->prepare("SELECT id, name, email, department, role, avatar, about FROM users WHERE name LIKE ? AND status = 'approved' AND role != 'guest' ORDER BY name LIMIT 20");
$stmt->execute(["%$q%"]);
jsonResponse(['success' => true, 'users' => $stmt->fetchAll()]);
