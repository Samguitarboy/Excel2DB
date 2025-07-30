const bcrypt = require('bcryptjs');

const plainPassword = 'admin123';
const hashedPassword = '$2a$10$7aYlWksuVdcKzM0K3M.xwe/ATZb.MXh9GJFX3kN8WIFMXvCV2xtQW';

bcrypt.compare(plainPassword, hashedPassword, (err, isMatch) => {
  if (err) {
    console.error('Error comparing passwords:', err);
    return;
  }
  console.log(`Does 'admin123' match the stored hash? ${isMatch}`);
});
