<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido.']);
    exit;
}

if (!empty($_POST['website'] ?? '')) {
    echo json_encode(['message' => 'Mensaje recibido.']);
    exit;
}

$name = trim(strip_tags($_POST['name'] ?? ''));
$email = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL);
$service = trim(strip_tags($_POST['service'] ?? 'Sin especificar'));
$message = trim(strip_tags($_POST['message'] ?? ''));
$recipient = getenv('CONTACT_RECIPIENT');

if (mb_strlen($name) < 2 || !$email || mb_strlen($message) < 20) {
    http_response_code(422);
    echo json_encode(['message' => 'Revisa el nombre, correo y mensaje antes de enviar.']);
    exit;
}

if (!$recipient || !filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
    http_response_code(503);
    echo json_encode(['message' => 'El formulario aún no está conectado. Escríbeme por WhatsApp.']);
    exit;
}

$subject = 'Nuevo proyecto web — ' . $service;
$body = "Nombre: {$name}\nCorreo: {$email}\nServicio: {$service}\n\nMensaje:\n{$message}";
$headers = [
    'From: EDAV OS <no-reply@edav.com.co>',
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
];

if (!mail($recipient, $subject, $body, implode("\r\n", $headers))) {
    http_response_code(502);
    echo json_encode(['message' => 'No fue posible enviar el mensaje. Intenta por WhatsApp.']);
    exit;
}

echo json_encode(['message' => 'Mensaje enviado correctamente.']);
