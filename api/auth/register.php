<?php
require_once __DIR__ . '/../../config/helpers.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = $_POST;
if (empty($data)) {
    $raw = json_decode(file_get_contents('php://input'), true);
    if ($raw) $data = $raw;
}
if (empty($data)) {
    jsonResponse(['error' => 'Invalid data'], 400);
}

$required = ['name', 'email', 'department', 'password', 'role'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        jsonResponse(['error' => "Field '$field' is required"], 400);
    }
}

$name = trim($data['name']);
$email = trim($data['email']);
$student_id = trim($data['student_id'] ?? '');
$department = trim($data['department']);
$password = $data['password'];
$role = strtolower(trim($data['role']));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['error' => 'Invalid email format'], 400);
}
if (!str_ends_with($email, 'uiu.ac.bd')) {
    jsonResponse(['error' => 'Must use a valid university domain address (uiu.ac.bd)'], 400);
}

$allowed_roles = ['student', 'faculty'];
if (!in_array($role, $allowed_roles, true)) {
    jsonResponse(['error' => 'Invalid role selected'], 400);
}
if ($role === 'student' && $student_id === '') {
    jsonResponse(['error' => 'Student ID is required'], 400);
}

try {
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'Email is already registered'], 409);
    }

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $avatar = $role === 'faculty' ? 'assets/images/faculties/default.png' : 'assets/images/students/default.png';

    if (isset($data['avatar_url']) && trim($data['avatar_url']) !== '') {
        $avatar = trim($data['avatar_url']);
    }

    $uploaded = uploadImage('avatar_file', 'avatars');
    if ($uploaded) {
        $avatar = $uploaded;
    }

    $stmt = $db->prepare("
        INSERT INTO users (name, email, student_id, department, password, role, avatar, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    ");
    $stmt->execute([$name, $email, $student_id ?: null, $department, $hashed_password, $role, $avatar]);
    $user_id = $db->lastInsertId();

    $stmt = $db->prepare("INSERT INTO verification_queue (user_id, requested_role, status) VALUES (?, ?, 'pending')");
    $stmt->execute([$user_id, ucfirst($role)]);

    notifyActivity('join_request', 0, adminIds(), ['actor_name' => $name, 'requested_role' => $role]);

    $_SESSION['user_id'] = $user_id;

    jsonResponse([
        'success' => true,
        'message' => 'Joining request submitted. An admin will review your account.',
        'pending' => true,
        'user' => ['id' => $user_id, 'role' => $role, 'status' => 'pending']
    ], 201);
} catch (PDOException $e) {
    error_log($e->getMessage());
    jsonResponse(['error' => 'Database error during registration'], 500);
}
