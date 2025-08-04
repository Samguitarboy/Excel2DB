const bcrypt = require('bcryptjs');

const plainPassword = 'admin123';
const hashedPassword = '$2b$10$hWxcgGtVpShQa35vK.e3TutQWq9u52s5RPSQg5cI8z6wr2jTViUte';

bcrypt.compare(plainPassword, hashedPassword, (err, isMatch) => {
  if (err) {
    console.error('Error comparing passwords:', err);
    return;
  }
  console.log(`Does 'admin123' match the stored hash? ${isMatch}`);
});
