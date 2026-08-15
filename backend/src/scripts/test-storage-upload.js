import 'dotenv/config';
import { StorageService } from '../services/StorageService.js';

async function testStorage() {
  console.log('--- Testing StorageService upload & delete ---');
  
  const dummyBuffer = Buffer.from('LinkStash Supabase Storage Test File', 'utf-8');
  const userId = 'test-user-123';
  const linkId = 'test-link-456';
  
  try {
    console.log('1. Uploading test buffer to Supabase Storage...');
    const uploadResult = await StorageService.uploadImageFromBuffer(dummyBuffer, {
      userId,
      linkId,
      mimeType: 'text/plain',
      extension: 'txt'
    });
    
    if (!uploadResult.success) {
      throw uploadResult.error || new Error('Upload failed');
    }

    console.log('✅ Upload succeeded!');
    console.log('   Public URL:', uploadResult.url);
    console.log('   Object Key / Public ID:', uploadResult.public_id);

    console.log('\n2. Deleting test object from Supabase Storage...');
    const deleteResult = await StorageService.deleteImage(uploadResult.public_id);
    if (!deleteResult.success) {
      throw deleteResult.error || new Error('Delete failed');
    }
    console.log('✅ Delete succeeded!', deleteResult.raw || deleteResult);
    
    console.log('\n🎉 StorageService integration test passed 100% against live Supabase!');
  } catch (err) {
    console.error('❌ StorageService test failed:', err);
  }
}

testStorage();
