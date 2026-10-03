<?php
require_once __DIR__ . '/../../config/helpers.php';
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$db = getDB();
$email = trim($_POST['email'] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonResponse(['error' => 'Valid email required'], 400);
try {
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user) jsonResponse(['error' => 'Email not found'], 404);
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+2 hours'));
    $db->prepare('INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)')->execute([$email, $token, $expires]);
    jsonResponse(['success' => true, 'message' => 'Reset link sent to your email']);
} catch (PDOException $e) { error_log($e->getMessage()); jsonResponse(['error' => 'Database error'], 500); }
