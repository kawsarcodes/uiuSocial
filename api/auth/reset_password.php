<?php
require_once __DIR__ . '/../../config/helpers.php';
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$db = getDB();
$code = trim($_POST['code'] ?? '');
$newPassword = trim($_POST['new_password'] ?? '');
if (!$code || !$newPassword) jsonResponse(['error' => 'Code and new password required'], 400);
try {
    $stmt = $db->prepare('SELECT email FROM password_resets WHERE token = ? AND expires_at > NOW()');
    $stmt->execute([$code]);
    $row = $stmt->fetch();
    if (!$row) jsonResponse(['error' => 'Invalid or expired code'], 400);
    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $db->prepare('UPDATE users SET password = ? WHERE email = ?')->execute([$hash, $row['email']]);
    $db->prepare('DELETE FROM password_resets WHERE token = ?')->execute([$code]);
    jsonResponse(['success' => true, 'message' => 'Password reset successfully']);
} catch (PDOException $e) { error_log($e->getMessage()); jsonResponse(['error' => 'Database error'], 500); }
