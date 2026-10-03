<?php
require_once __DIR__ . '/../../config/helpers.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['email']) || !isset($data['password'])) {
    jsonResponse(['error' => 'Email and password are required'], 400);
}

$email = trim($data['email']);
$password = $data['password'];
$role = isset($data['role']) ? strtolower(trim($data['role'])) : null;

try {
    $db = getDB();

    if ($role === 'guest') {
        $stmt = $db->prepare("SELECT id, role, status FROM users WHERE role = 'guest' ORDER BY id ASC LIMIT 1");
        $stmt->execute();
        $guest = $stmt->fetch();
        if (!$guest) {
            jsonResponse(['error' => 'Guest access is not available'], 500);
        }
        $_SESSION['user_id'] = $guest['id'];
        jsonResponse(['success' => true, 'message' => 'Browsing as guest', 'user' => ['id' => $guest['id'], 'role' => 'guest', 'status' => 'approved']]);
    }

    $stmt = $db->prepare("SELECT id, password, role, status FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        if ($user['status'] === 'rejected') {
            jsonResponse(['error' => 'Your joining request was declined.'], 403);
        }
        $_SESSION['user_id'] = $user['id'];
        jsonResponse([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'role' => $user['role'],
                'status' => $user['status'] ?? 'approved'
            ]
        ]);
    }

    jsonResponse(['error' => 'Invalid email or password'], 401);
} catch (PDOException $e) {
    error_log($e->getMessage());
    jsonResponse(['error' => 'Database error during login'], 500);
}
