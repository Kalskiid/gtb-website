<?php
/**
 * Contact form mailer for globaltopbrands.eu
 * Reads recipient + copy from data/contact.json (edited via Pages CMS).
 * Uses PHP mail() — works out-of-the-box on SuperHosting shared hosting.
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

/* --- helpers --- */
function fail(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}
function clean(string $s, int $max = 5000): string {
    $s = trim($s);
    if (mb_strlen($s) > $max) $s = mb_substr($s, 0, $max);
    return $s;
}

/* --- method + basic guards --- */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail(405, 'method-not-allowed');

/* honeypot */
if (!empty($_POST['website'] ?? '')) {
    /* pretend success so bots don't retry */
    echo json_encode(['ok' => true, 'message' => 'ok']);
    exit;
}

/* rate-limit per IP: max 5 sends / 10 min via cache file */
$ip     = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$bucket = sys_get_temp_dir() . '/gtb_form_' . md5($ip);
$now    = time();
$hits   = [];
if (is_file($bucket)) {
    $raw  = @file_get_contents($bucket);
    $hits = $raw ? array_values(array_filter(json_decode($raw, true) ?: [], fn($t) => $t > $now - 600)) : [];
}
if (count($hits) >= 5) fail(429, 'too-many-requests');
$hits[] = $now;
@file_put_contents($bucket, json_encode($hits));

/* --- collect + validate --- */
$name    = clean($_POST['name']    ?? '', 200);
$email   = clean($_POST['email']   ?? '', 200);
$company = clean($_POST['company'] ?? '', 200);
$phone   = clean($_POST['phone']   ?? '', 60);
$message = clean($_POST['message'] ?? '', 5000);

if ($name === '' || $message === '') fail(422, 'missing-fields');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail(422, 'bad-email');

/* --- recipient from CMS --- */
$cfgFile = __DIR__ . '/data/contact.json';
$cfg     = is_file($cfgFile) ? (json_decode(file_get_contents($cfgFile), true) ?: []) : [];
$to      = filter_var($cfg['send_to'] ?? 'b2b@globaltopbrands.eu', FILTER_VALIDATE_EMAIL)
           ?: 'b2b@globaltopbrands.eu';
$success = $cfg['form_success'] ?? "Thanks — we'll reply within 24 hours.";

/* --- build message --- */
$host    = $_SERVER['HTTP_HOST'] ?? 'globaltopbrands.eu';
$subject = "[GTB inquiry] {$name}" . ($company !== '' ? " · {$company}" : '');
$body    =  "New inquiry from {$host}\n"
          . str_repeat('-', 40) . "\n"
          . "Name:    {$name}\n"
          . "Email:   {$email}\n"
          . ($company !== '' ? "Company: {$company}\n" : '')
          . ($phone   !== '' ? "Phone:   {$phone}\n"   : '')
          . str_repeat('-', 40) . "\n\n"
          . $message . "\n\n"
          . str_repeat('-', 40) . "\n"
          . "IP:  {$ip}\n"
          . "UA:  " . ($_SERVER['HTTP_USER_AGENT'] ?? '') . "\n"
          . "At:  " . date('c') . "\n";

/* --- headers ---
 * From: real mailbox on the site's domain (SPF/DKIM); Reply-To points at the visitor. */
$fromAddr = 'b2b@globaltopbrands.eu';
$fromName = 'Global Top Brands Website';

/* encode name safely for RFC 5322 (mb-safe) */
$encName    = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
$encSubject = '=?UTF-8?B?' . base64_encode($subject)  . '?=';

$headers  = "From: {$encName} <{$fromAddr}>\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";

/* --- send --- */
$ok = @mail($to, $encSubject, $body, $headers, "-f{$fromAddr}");
if (!$ok) fail(500, 'mail-failed');

echo json_encode(['ok' => true, 'message' => $success]);
