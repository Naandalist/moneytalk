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
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  timezone TEXT DEFAULT 'UTC',
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI suggestions table
CREATE TABLE ai_suggestions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  suggestion TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily refresh count table
CREATE TABLE daily_refresh_count (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Settings table
CREATE TABLE settings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_refresh_count ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user data access
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own AI suggestions" ON ai_suggestions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own refresh counts" ON daily_refresh_count
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own settings" ON settings
  FOR ALL USING (auth.uid() = user_id);
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