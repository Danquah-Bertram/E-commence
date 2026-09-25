import bcrypt from 'bcryptjs';
import { Database } from '../database.js';

const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Fast Charging USB-C Cable',
    description: 'Durable braided USB-C cable with fast charging support. Compatible with all USB-C devices. 6ft length with reinforced connectors.',
    price: 45.00,
    imageUrl: 'https://images.unsplash.com/photo-1766639214202-7eab6e6d1c53?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG9uZSUyMGNoYXJnZXIlMjBhY2Nlc3Nvcnl8ZW58MXx8fHwxNjcwMzk2NDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    available: true,
    category: 'chargers',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-2',
    name: 'Wireless Bluetooth Earphones',
    description: 'Premium wireless earphones with noise cancellation, 8-hour battery life, and crystal clear sound quality. Includes charging case.',
    price: 120.00,
    imageUrl: 'https://images.unsplash.com/photo-1672925216556-c995d23aab2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aXJlbGVzcyUyMGVhcnBob25lc3xlbnwxfHx8fDE3NjcwMzk2NDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    available: true,
    category: 'earphones',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-3',
    name: '20,000mAh Power Bank',
    description: 'High-capacity portable charger with dual USB ports and LED display. Fast charging technology for quick device charging on the go.',
    price: 85.00,
    imageUrl: 'https://images.unsplash.com/photo-1585995603413-eb35b5f4a50b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3dlciUyMGJhbmt8ZW58MXx8fHwxNzY3MDI2NjcyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    available: true,
    category: 'power-banks',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-4',
    name: 'Protective Phone Case',
    description: 'Shockproof silicone case with raised edges for screen protection. Slim design with precise cutouts for all buttons and ports.',
    price: 35.00,
    imageUrl: 'https://images.unsplash.com/photo-1764116679125-b1db58fb37f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG9uZSUyMGNhc2UlMjBwcm90ZWN0aXZlfGVufDF8fHx8MTc2NzAzOTY0NXww&ixlib=rb-4.1.0&q=80&w=1080',
    available: true,
    category: 'phone-cases',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-5',
    name: 'Multi-Port USB Charger',
    description: '4-port USB charging hub with intelligent power distribution. Compact design perfect for travel or home use.',
    price: 55.00,
    imageUrl: 'https://images.unsplash.com/photo-1619459072761-496c0812331b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG9uZSUyMGNhYmxlJTIwdXNifGVufDF8fHx8MTc2NzAzOTY0Nnww&ixlib=rb-4.1.0&q=80&w=1080',
    available: true,
    category: 'chargers',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-6',
    name: 'Portable Bluetooth Speaker',
    description: 'Waterproof wireless speaker with 360° sound and 12-hour battery life. Perfect for outdoor activities.',
    price: 95.00,
    imageUrl: 'https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibHVldG9vdGglMjBzcGVha2VyfGVufDF8fHx8MTc2Njk4MDA3NXww&ixlib=rb-4.1.0&q=80&w=1080',
    available: true,
    category: 'other',
    createdAt: new Date().toISOString()
  },
];

async function initializeData() {
  console.log('🔄 Initializing database...');

  // Check if products already exist
  const existingProducts = Database.getAll('products');
  if (existingProducts.length === 0) {
    console.log('📦 Adding initial products...');
    INITIAL_PRODUCTS.forEach(product => {
      Database.create('products', product);
    });
    console.log('✅ Products added successfully!');
  } else {
    console.log('⏭️  Products already exist, skipping...');
  }

  // Check if admin user exists
  const existingUsers = Database.getAll('users');
  const adminExists = existingUsers.some(user => user.email === 'admin@phoneaccess.com');
  
  if (!adminExists) {
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('Bertram', 10);
    
    const adminUser = {
      id: 'user-admin',
      name: 'Admin User',
      email: 'admin@phoneaccess.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    
    Database.create('users', adminUser);
    console.log('✅ Admin user created!');
    console.log('📧 Email: admin@phoneaccess.com');
    console.log('🔑 Password: Bertram');
  } else {
    console.log('⏭️  Admin user already exists, skipping...');
  }

  console.log('\n✨ Database initialization complete!');
  console.log('\n📝 You can now:');
  console.log('   1. Start the server: npm run server');
  console.log('   2. Start the frontend: npm run dev');
  console.log('   3. Or run both: npm run dev:all');
  console.log('\n🔐 Admin Login:');
  console.log('   Email: admin@phoneaccess.com');
  console.log('   Password: Bertram\n');
}

initializeData().catch(console.error);
