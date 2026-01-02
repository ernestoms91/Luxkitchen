export const resendActivation = `
<!DOCTYPE html>
<html>
  <body>
    <h1>Hola, {{userName}} 👋</h1>
    <p>Has solicitado reenviar el enlace de activación.</p>
    <p>Por favor, confirma tu cuenta haciendo clic en este enlace:</p>
    <a href="{{confirmationLink}}">Confirmar cuenta</a>
    <p>Si no solicitaste esto, simplemente ignora este correo.</p>
  </body>
</html>`;
