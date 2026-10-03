<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    $db = getDB();
    $current_user_id = getCurrentUserId();
    $content = trim($_POST['content'] ?? '');
    $groupId = isset($_POST['group_id']) ? (int) $_POST['group_id'] : null;
    if (!$groupId) $groupId = null;

    $imagePath = uploadImage('image', 'posts');
    if (!$imagePath && !empty($_POST['image_url'])) {
        $imagePath = trim($_POST['image_url']);
        if (str_starts_with($imagePath, 'data:')) {
            $imagePath = null;
        }
    }

    if ($content === '' && !$imagePath) {
        jsonResponse(['error' => 'Post content cannot be empty'], 400);
    }

    if ($groupId) {
        $stmt = $db->prepare("SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND role != 'requested'");
        $stmt->execute([$groupId, $current_user_id]);
        if (!$stmt->fetch() && !isAdmin()) {
            jsonResponse(['error' => 'Join this group before posting'], 403);
        }
    }

    $stmt = $db->prepare("INSERT INTO posts (user_id, content, image, group_id) VALUES (?, ?, ?, ?)");
    $stmt->execute([$current_user_id, $content, $imagePath, $groupId]);
    $postId = (int) $db->lastInsertId();

    $audience = $groupId ? groupMemberIds($groupId) : followerIds($current_user_id);
    notifyActivity('new_post', $current_user_id, $audience, [
        'post_id' => $postId,
        'group_id' => $groupId,
        'snippet' => $content,
    ]);

    jsonResponse(['success' => true, 'message' => 'Post created successfully', 'post_id' => $postId], 201);
} catch (PDOException $e) {
    error_log($e->getMessage());
    jsonResponse(['error' => 'Database error'], 500);
}
