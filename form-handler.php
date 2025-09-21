<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Odbieranie danych z formularza
    $name = strip_tags(trim($_POST["name"]));
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $subject = strip_tags(trim($_POST["subject"]));
    $message = strip_tags(trim($_POST["message"]));
    
    // Sprawdzanie poprawności danych
    if (empty($name) || empty($message) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo "Proszę wypełnić wszystkie pola formularza poprawnie.";
        exit;
    }
    
    // Adres odbiorcy wiadomości
    $recipient = "republicofglobo@outlook.com";
    
    // Mapowanie wartości subject na czytelne nazwy
    $subjectMap = [
        "general" => "Zapytanie ogólne",
        "join" => "Chcę dołączyć",
        "partnership" => "Współpraca",
        "technical" => "Problem techniczny",
        "other" => "Inne"
    ];
    
    $subjectText = $subjectMap[$subject] ?? "Inne";
    
    // Tytuł wiadomości
    $email_subject = "Nowa wiadomość ze strony Republiki Globo: $subjectText";
    
    // Zawartość wiadomości
    $email_content = "Imię i nazwisko: $name\n";
    $email_content .= "Email: $email\n";
    $email_content .= "Temat: $subjectText\n\n";
    $email_content .= "Wiadomość:\n$message\n";
    
    // Nagłówki emaila
    $email_headers = "From: $name <$email>";
    
    // Wysyłanie emaila
    if (mail($recipient, $email_subject, $email_content, $email_headers)) {
        http_response_code(200);
        echo "Dziękujemy! Twoja wiadomość została wysłana.";
    } else {
        http_response_code(500);
        echo "Ups! Coś poszło nie tak i nie udało się wysłać wiadomości.";
    }
} else {
    http_response_code(403);
    echo "Wystąpił problem z Twoim zgłoszeniem, spróbuj ponownie.";
}