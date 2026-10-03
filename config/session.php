<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/database.php';

// Check if user is logged in
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

// Require login - redirect if not authenticated
function requireLogin() {
    if (!isLoggedIn()) {
        // If this is an API call, return JSON error
        if (strpos($_SERVER['REQUEST_URI'], '/api/') !== false) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Not authenticated']);
            exit;
        }
        // Otherwise redirect to login page
        header('Location: login.php');
        exit;
    }
}

// Get current logged-in user data
function getCurrentUser() {
    if (!isLoggedIn()) return null;
    
    $db = getDB();
    $stmt = $db->prepare("SELECT id, name, email, student_id, department, role, avatar, cover_photo, about, is_online, status FROM users WHERE id = ?");
    try {
        $stmt->execute([$_SESSION['user_id']]);
        return $stmt->fetch() ?: null;
    } catch (PDOException $e) {
        $stmt = $db->prepare("SELECT id, name, email, student_id, department, role, avatar, about, is_online FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        if ($user) {
            $user['status'] = 'approved';
            $user['cover_photo'] = null;
        }
        return $user ?: null;
    }
}

// Get current user ID
function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

// JSON response helper
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Database clock, used so relative times match stored timestamps
function dbNow() {
    static $now = null;
    if ($now === null) {
        try {
            $now = getDB()->query('SELECT NOW() n')->fetch()['n'];
        } catch (Exception $e) {
            $now = date('Y-m-d H:i:s');
        }
    }
    return $now;
}

// Time ago helper
function timeAgo($datetime) {
    if (!$datetime) return '';
    try {
        $now = new DateTime(dbNow());
        $ago = new DateTime($datetime);
    } catch (Exception $e) {
        return '';
    }
    $diff = $now->diff($ago);

    if ($diff->y > 0) return $diff->y . 'y ago';
    if ($diff->m > 0) return $diff->m . 'mo ago';
    if ($diff->d > 0) return $diff->d . 'd ago';
    if ($diff->h > 0) return $diff->h . 'h ago';
    if ($diff->i > 0) return $diff->i . 'm ago';
    return 'Just now';
}
