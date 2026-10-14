// Fills the database with demo users, posts, comments, follows and stories.
// Usage: npm run seed   (log in afterwards with  demo / demo123)
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('./config/db');
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Notification = require('./models/Notification');
const Story = require('./models/Story');

const UPLOADS = path.join(__dirname, '..', 'uploads');
const SEED_DIR = path.join(UPLOADS, 'seed');

const PALETTES = [
  ['#f9ce34', '#ee2a7b'], ['#43cea2', '#185a9d'], ['#ff9a8b', '#a18cd1'], ['#f6d365', '#fda085'],
  ['#667eea', '#764ba2'], ['#89f7fe', '#66a6ff'], ['#fddb92', '#d1fdff'], ['#ff758c', '#ff7eb3'],
  ['#0ba360', '#3cba92'], ['#c471f5', '#fa71cd'], ['#48c6ef', '#6f86d6'], ['#f093fb', '#f5576c'],
];

function svgImage(file, { emoji, title, colors, w = 1080, h = 1350 }) {
  const [a, b] = colors;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${w * 0.8}" cy="${h * 0.15}" r="${w * 0.25}" fill="#fff" opacity="0.12"/>
  <circle cx="${w * 0.1}" cy="${h * 0.9}" r="${w * 0.3}" fill="#fff" opacity="0.1"/>
  <text x="50%" y="46%" font-size="${w * 0.3}" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  ${title ? `<text x="50%" y="72%" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${w * 0.065}" font-weight="700" fill="#fff" text-anchor="middle">${title}</text>` : ''}
</svg>`;
  fs.writeFileSync(path.join(SEED_DIR, file), svg);
  return `/uploads/seed/${file}`;
}

const USERS = [
  { username: 'demo', fullName: 'Demo User', bio: 'This is the demo account 👋\nTry liking, commenting & following!', avatar: '😊' },
  { username: 'mitishapatidar', fullName: 'Mitisha 🤍', bio: 'Full stack dev intern @CodeAlpha 💻\nCoffee • Code • Travel', website: 'github.com/mitishapatidar', avatar: '👩‍💻', isVerified: true },
  { username: 'foodie_diaries', fullName: 'Foodie Diaries', bio: 'Easy recipes every day 🍕🍝\nDM for collabs', avatar: '🍕', isVerified: true },
  { username: 'travel.with.aarav', fullName: 'Aarav Sharma', bio: 'Exploring one city at a time ✈️ 23 countries', avatar: '✈️' },
  { username: 'nail_art_studio', fullName: 'Nail Art Studio', bio: 'Press-on nails 💅 Custom orders open', avatar: '💅' },
  { username: 'priya.codes', fullName: 'Priya Verma', bio: 'Frontend dev | JS enthusiast ⚛️', avatar: '👩🏻‍🎤' },
  { username: 'fitwithrohan', fullName: 'Rohan Fitness', bio: 'Coach 🏋️ Daily workouts & tips', avatar: '🏋️' },
  { username: 'pet.paradise', fullName: 'Pet Paradise', bio: 'Cutest pets on the internet 🐶🐱', avatar: '🐶' },
  { username: 'sneha.art', fullName: 'Sneha Art', bio: 'Painting my feelings 🎨', avatar: '🎨' },
];

const POSTS = {
  'mitishapatidar': [
    ['💻', 'Hello World', 'Started my full stack internship at #CodeAlpha 🚀 Building an Instagram clone with #expressjs and #mongodb! #webdev'],
    ['☕', 'Monday mood', 'Coffee first, code later ☕ #coding #developerlife'],
    ['🌅', '', 'Sunsets & silence 🌅 #travel #nature'],
  ],
  'foodie_diaries': [
    ['🍕', 'Easiest Pizza', 'Easiest pizza recipe ever 🍕 Save it for later! #food #recipe #pizza'],
    ['🥪', 'Cheese Toast', 'Crispy cheese toast in 10 mins 🧀 #food #breakfast'],
    ['🍝', '', 'Pasta night 🍝 What is your favourite sauce? #food #pasta'],
  ],
  'travel.with.aarav': [
    ['🏔️', 'Manali', 'Woke up to this view in Manali 🏔️ #travel #himalayas #india'],
    ['🏖️', 'Goa', 'Beach days are the best days 🌊 #travel #goa'],
  ],
  'nail_art_studio': [
    ['💅', 'Rose Gold', 'Rose gold press-ons for the wedding season 🌹 #nails #nailart'],
    ['🌸', 'Pastel Pink', 'Soft pastel set 🌸 Which one would you pick? #nails #pastel'],
  ],
  'priya.codes': [
    ['⚛️', 'Learn JS', 'Day 50 of #100DaysOfCode ✅ Learned closures today! #javascript #webdev'],
    ['🖥️', 'My setup', 'Finally finished my desk setup 🖥️ #setup #coding'],
  ],
  'fitwithrohan': [['🏋️', 'Leg Day', 'Never skip leg day 💪 #fitness #gym #motivation']],
  'pet.paradise': [
    ['🐶', 'Good Boy', 'Meet Bruno, the goodest boy 🐶❤️ #dogs #pets'],
    ['🐱', '', 'Caught napping again 😴 #cats #pets'],
  ],
  'sneha.art': [['🎨', 'Starry Night', 'My take on Starry Night 🌌 #art #painting', ['🌌', 'Process']]],
};

const COMMENTS = ['Wow 😍', 'This is amazing! 🔥', 'Love it ❤️', 'So cool!!', 'Need this right now 😋', 'Beautiful 🙌', 'Goals ✨', 'Great work 👏', 'Haha love this 😂', 'Saving this! 📌'];

const pick = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
const hoursAgo = (h) => new Date(Date.now() - h * 36e5);

(async () => {
  await connectDB();
  console.log('🧹 Clearing old data...');
  await Promise.all([User.deleteMany({}), Post.deleteMany({}), Comment.deleteMany({}), Notification.deleteMany({}), Story.deleteMany({})]);
  fs.rmSync(SEED_DIR, { recursive: true, force: true });
  fs.mkdirSync(SEED_DIR, { recursive: true });

  console.log('👤 Creating users...');
  const password = await bcrypt.hash('demo123', 10);
  const users = {};
  for (const [i, u] of USERS.entries()) {
    const avatar = svgImage(`avatar-${u.username}.svg`, { emoji: u.avatar, colors: PALETTES[i % PALETTES.length], w: 400, h: 400 });
    users[u.username] = await User.create({ ...u, avatar, email: `${u.username.replace(/\./g, '')}@example.com`, password, createdAt: hoursAgo(24 * 30) });
  }
  // demo user starts without a photo to show the default avatar & "add photo" flow
  users.demo.avatar = '';
  await users.demo.save();

  console.log('🤝 Following...');
  const all = Object.values(users);
  for (const u of all) {
    const others = all.filter((o) => !o._id.equals(u._id));
    const follows = u.username === 'demo' ? others.filter((o) => ['mitishapatidar', 'foodie_diaries', 'travel.with.aarav', 'pet.paradise'].includes(o.username)) : pick(others, 3 + Math.floor(Math.random() * 4));
    for (const f of follows) {
      await User.updateOne({ _id: u._id }, { $addToSet: { following: f._id } });
      await User.updateOne({ _id: f._id }, { $addToSet: { followers: u._id } });
      await Notification.notify({ recipient: f._id, sender: u._id, type: 'follow', createdAt: hoursAgo(Math.random() * 200) });
    }
  }

  console.log('📸 Creating posts, likes & comments...');
  let p = 0;
  let hour = 2;
  for (const [username, list] of Object.entries(POSTS)) {
    for (const [emoji, title, caption, extra] of list) {
      const images = [svgImage(`post-${p}.svg`, { emoji, title, colors: PALETTES[p % PALETTES.length] })];
      if (extra) images.push(svgImage(`post-${p}-b.svg`, { emoji: extra[0], title: extra[1], colors: PALETTES[(p + 3) % PALETTES.length] }));
      const likers = pick(all.filter((u) => u.username !== username), 2 + Math.floor(Math.random() * 6));
      const createdAt = hoursAgo((hour += 5 + Math.random() * 12));
      const post = await Post.create({
        author: users[username]._id, images, caption, hashtags: Post.parseHashtags(caption),
        likes: likers.map((u) => u._id), createdAt, updatedAt: createdAt,
        location: emoji === '🏔️' ? 'Manali, Himachal Pradesh' : emoji === '🏖️' ? 'Goa, India' : '',
      });
      for (const l of likers) await Notification.notify({ recipient: post.author, sender: l._id, type: 'like', post: post._id });
      const commenters = pick(all.filter((u) => u.username !== username), 1 + Math.floor(Math.random() * 3));
      for (const c of commenters) {
        const text = pick(COMMENTS, 1)[0];
        const comment = await Comment.create({ post: post._id, author: c._id, text, createdAt: new Date(createdAt.getTime() + 36e5) });
        await Notification.notify({ recipient: post.author, sender: c._id, type: 'comment', post: post._id, comment: comment._id, text });
      }
      post.commentsCount = commenters.length;
      await post.save();
      p += 1;
    }
  }

  console.log('⭕ Creating stories...');
  for (const [i, username] of ['mitishapatidar', 'foodie_diaries', 'travel.with.aarav', 'pet.paradise', 'nail_art_studio'].entries()) {
    const img = svgImage(`story-${i}.svg`, { emoji: ['🎉', '🍩', '🚗', '🐾', '✨'][i], title: ['Weekend!', 'Snack time', 'Road trip', 'Zoomies', 'New drop'][i], colors: PALETTES[(i + 5) % PALETTES.length], w: 1080, h: 1920 });
    await Story.create({ author: users[username]._id, image: img, createdAt: hoursAgo(i + 1) });
  }

  console.log(`\n✅ Seeded ${all.length} users and ${p} posts.`);
  console.log('👉 Log in with  username: demo   password: demo123  (all seed users use demo123)');
  await disconnectDB();
  process.exit(0);
})().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
