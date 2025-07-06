# Supabase Cloud Backup Setup

This guide explains how to set up Supabase for the MoneyTalk cloud backup feature.

## Prerequisites

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new Supabase project

## Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:

```env
OPENAI_API_KEY=your_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

Run the following SQL commands in your Supabase SQL editor:

### 1. Create Tables

```sql
-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  timezone TEXT DEFAULT 'Asia/Jakarta',
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT,
  date TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI suggestions table
CREATE TABLE ai_suggestions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  suggestion TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily refresh count table
CREATE TABLE daily_refresh_count (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Settings table
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);
```

### 2. Create Indexes

```sql
-- Indexes for better performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_image_url ON transactions(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX idx_daily_refresh_count_user_id ON daily_refresh_count(user_id);
CREATE INDEX idx_settings_user_id ON settings(user_id);
```

### 3. Storage Setup

Create a storage bucket for receipt images:

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `images`
3. Set the bucket to public (for easier access to receipt images)
4. Or configure RLS policies for the bucket if you prefer private storage

### 4. Row Level Security (RLS) Policies

**Option 1: Disable RLS (Recommended for device-based auth)**

```sql
-- Disable RLS for device-based authentication
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_refresh_count DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
```

**Option 2: Enable RLS with permissive policies (Alternative)**

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_refresh_count ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- User profiles policies (allow all operations)
CREATE POLICY "Allow all operations on user_profiles" ON user_profiles
  FOR ALL USING (true) WITH CHECK (true);

-- Transactions policies (allow all operations)
CREATE POLICY "Allow all operations on transactions" ON transactions
  FOR ALL USING (true) WITH CHECK (true);

-- AI suggestions policies (allow all operations)
CREATE POLICY "Allow all operations on ai_suggestions" ON ai_suggestions
  FOR ALL USING (true) WITH CHECK (true);

-- Daily refresh count policies (allow all operations)
CREATE POLICY "Allow all operations on daily_refresh_count" ON daily_refresh_count
  FOR ALL USING (true) WITH CHECK (true);

-- Settings policies (allow all operations)
CREATE POLICY "Allow all operations on settings" ON settings
  FOR ALL USING (true) WITH CHECK (true);
```

## Authentication Setup

**Important**: This app uses device-based authentication instead of traditional user authentication. You don't need to enable any authentication providers in Supabase.

The app generates a unique device ID for each installation and uses it to identify users. This approach:
- Doesn't require user registration/login
- Maintains data privacy per device
- Works offline and syncs when online

## Installation

1. Install the required dependencies:

```bash
npm install expo-crypto expo-image-manipulator
# or
yarn add expo-crypto expo-image-manipulator
```

2. If using Expo development build, rebuild your app:

```bash
eas build --profile development
```

## Features

The cloud backup system provides:

- **Automatic Sync**: Syncs data when online
- **Manual Backup/Restore**: User-controlled backup and restore
- **Device-based Authentication**: No user accounts required
- **Data Privacy**: Each device has isolated data
- **Offline Support**: Works offline, syncs when connected
- **Receipt Image Storage**: Automatically resizes images to under 100KB and stores them in Supabase storage

## Troubleshooting

### Common Issues

1. **"Failed to initialize cloud backup"**: Check your Supabase URL and anon key

2. **RLS Policy Violations**: If you see "new row violates row-level security policy" errors:
   - **Quick Fix**: Disable RLS using Option 1 above (recommended for device-based auth)
   - **Alternative**: Use Option 2 with permissive policies
   - **Check**: Verify policies are applied correctly in Supabase dashboard

3. **UUID Format Errors**: If you see "invalid input syntax for type uuid":
   - Clear app data/storage to regenerate device ID
   - Ensure `expo-crypto` is properly installed
   - Check that device ID generation is working correctly

4. **"Database connection failed"**: Verify your Supabase project is active

5. **"Sync failed"**: Check internet connection and Supabase status

### Debugging Steps

1. Check Supabase logs in the dashboard for detailed error messages
2. Verify table structure matches the schema above
3. Test database connection using Supabase SQL editor
4. Ensure all required dependencies are installed (`expo-crypto`)

### Debug Mode

To enable debug logging, check the console for detailed error messages when cloud backup operations fail.