import { connect, connection, Model, model, Schema } from 'mongoose';
import * as argon2 from 'argon2';

async function runSeeder() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/finance';
  await connect(mongoUri);
  console.log('Connected to MongoDB for seeding');

  const userSchema = new Schema(
    {
      name: String,
      email: { type: String, unique: true },
      password: String,
      roles: [String],
    },
    { timestamps: true }
  );
  const User: Model<any> = model('User', userSchema);

  const adminEmail = 'admin@finance.local';
  const existing = await User.findOne({ email: adminEmail }).lean();
  if (existing) {
    console.log('Admin user already exists. Skipping seeder.');
    await connection.close();
    return;
  }

  const hashed = await argon2.hash(process.env.SEED_ADMIN_PASSWORD || '123456');
  await User.create({
    name: 'Administrador',
    email: adminEmail,
    password: hashed,
    roles: ['admin'],
  });

  console.log('Admin user created:', adminEmail);
  await connection.close();
}

if (require.main === module) {
  runSeeder().catch((err) => {
    console.error('Seeder failed', err);
    process.exit(1);
  });
}

