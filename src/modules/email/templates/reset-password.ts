export const resetPassword = `
<!DOCTYPE html>
<html>
  <body>
    <h2>Hola {{userName}}</h2>
    <p>Recibimos una solicitud para restablecer tu contraseña.</p>

    <p>
      <a href="{{resetLink}}" target="_blank">
        Restablecer contraseña
      </a>
    </p>

    <p>Este enlace expirará en 15 minutos.</p>

    <p>
      Si no solicitaste este cambio, puedes ignorar este correo.
    </p>
  </body>
</html>
`;
