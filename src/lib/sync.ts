import { db } from './db';

// Placeholder sync logic — connection to Cloud database 
// will be established via generated Supabase client once Cloud is enabled.
export async function syncOfflineData() {
  const pendingActivities = await db.activities.where('syncStatus').equals('pending').toArray();
  
  for (const activity of pendingActivities) {
    try {
      // Logic for cloud-sync will be implemented once Cloud/Supabase is fully configured.
      console.log('Syncing activity:', activity.id);
      
      // Mark as synced for now
      await db.activities.update(activity.id, { syncStatus: 'synced' });
    } catch (e) {
      console.error('Sync failed', e);
    }
  }
}
