<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$clubId = (int)($data['club_id'] ?? 0);
if (!$clubId) jsonResponse(['error' => 'Club ID required'], 400);
if (!isClubManager($clubId)) jsonResponse(['error' => 'Not allowed'], 403);
$fields = [];
$params = [];
if (isset($data['name'])) { $fields[] = 'name = ?'; $params[] = trim($data['name']); }
if (isset($data['category'])) { $fields[] = 'category = ?'; $params[] = trim($data['category']); }
if (isset($data['about'])) { $fields[] = 'about = ?'; $params[] = trim($data['about']); }
if ($fields) {
    $params[] = $clubId;
    $db = getDB();
    $db->prepare("UPDATE clubs SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = ?")->execute($params);
}
jsonResponse(['success' => true, 'message' => 'Club updated']);
