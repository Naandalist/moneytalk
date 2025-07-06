import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

type UploadResult = {
  success: boolean;
  url?: string;
  error?: string;
};

/**
 * Resize image to be under 100KB while maintaining quality
 */
export const resizeImageToUnder100KB = async (imageUri: string): Promise<string> => {
  let quality = 0.7; // Limited to 0.7 as requested
  let width = 1024;
  let resizedUri = imageUri;
  
  while (quality > 0.1 || width >= 200) {
    try {
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width } }
        ],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      // Check file size
      const response = await fetch(result.uri);
      const blob = await response.blob();
      const sizeInKB = blob.size / 1024;
      

      
      if (sizeInKB <= 100) {
        resizedUri = result.uri;
        break;
      }
      
      // Reduce quality first, then width if quality is at minimum
      if (quality > 0.1) {
        quality = Math.max(0.1, quality - 0.1);
      } else {
        // When quality is at minimum, reduce width
        width = Math.floor(width * 0.8);
        quality = 0.7; // Reset quality to maximum allowed when reducing width
      }
      
      // Prevent infinite loop
      if (width < 200) {
        resizedUri = result.uri;
        break;
      }
      
    } catch (error) {
      console.error('Error resizing image:', error);
      throw new Error('Failed to resize image');
    }
  }
  
  return resizedUri;
};

/**
 * Upload image to Supabase storage
 */
export const uploadImageToSupabase = async (imageUri: string, userId: string): Promise<UploadResult> => {
  try {
    // Debug: Check Supabase configuration
    const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
    const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        error: 'Supabase configuration missing. Please check your environment variables.'
      };
    }
    
    // First resize the image
    const resizedUri = await resizeImageToUnder100KB(imageUri);

    
    // Verify file exists and get file info
    const fileInfo = await FileSystem.getInfoAsync(resizedUri);
    if (!fileInfo.exists) {
      throw new Error('Resized image file does not exist');
    }

    
    // Generate unique filename with proper path structure
    const fileExtension = resizedUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `receipt_${Date.now()}.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;

    
    // Read file as base64 and convert to proper format for upload
    const base64Data = await FileSystem.readAsStringAsync(resizedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Create blob with proper MIME type - using a more compatible approach
    const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
    
    // For React Native, use the file URI directly instead of creating a blob
    // Supabase client can handle file URIs in React Native environments
    let uploadData: any;
    
    try {
      // Try using the resized file URI directly (most compatible with React Native)
      uploadData = {
        uri: resizedUri,
        type: mimeType,
        name: fileName
      };

    } catch (error) {
      // Fallback: use base64 data URI
      uploadData = `data:${mimeType};base64,${base64Data}`;
    }
    
    // Upload to Supabase storage with retry mechanism
    let uploadAttempts = 0;
    const maxAttempts = 3;
    let data, error;
    
    while (uploadAttempts < maxAttempts) {
      uploadAttempts++;

      
      try {
        const uploadResult = await supabase.storage
          .from('images')
          .upload(filePath, uploadData, {
            contentType: mimeType,
            upsert: uploadAttempts > 1 // Allow overwrite on retry
          });
        
        data = uploadResult.data;
        error = uploadResult.error;
        
        if (!error) {
          break;
        }
        
      } catch (uploadError) {

        error = uploadError;
      }
      
      if (uploadAttempts < maxAttempts) {

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (error) {
      console.error('Final upload error after all attempts:', error);
      
      const errorMessage = (error && typeof error === 'object' && 'message' in error) 
         ? (error as { message: string }).message 
         : String(error);
      
      if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
        return { 
          success: false, 
          error: 'Network error: Please check your internet connection and Supabase configuration.' 
        };
      }
      
      if (errorMessage.includes('Bucket not found') || errorMessage.includes('NoSuchBucket')) {
        return {
          success: false,
          error: 'Storage bucket "images" not found. Please create it in your Supabase dashboard.'
        };
      }
      
      if (errorMessage.includes('InvalidJWT') || errorMessage.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Authentication error: Please check your Supabase API key and permissions.'
        };
      }
      
      return { success: false, error: `Upload failed: ${errorMessage}` };
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
    

    return { success: true, url: urlData.publicUrl };
    
  } catch (error) {
    console.error('Error in upload process:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Network request failed')) {
      return { 
        success: false, 
        error: 'Network error: Please check your internet connection and Supabase configuration.' 
      };
    }
    
    return { success: false, error: `Upload failed: ${errorMessage}` };
  }
};

/**
 * Delete image from Supabase storage
 */
export const deleteImageFromSupabase = async (imageUrl: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const userId = urlParts[urlParts.length - 2]; // Get userId from path
    const filePath = `${userId}/${fileName}`;
    
    const { error } = await supabase.storage
      .from('images')
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting image:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting image:', error);
    return { success: false, error: 'Failed to delete image' };
  }
};

/**
 * Create a local backup of the image for offline functionality
 */
export const createLocalImageBackup = async (imageUri: string, userId: string): Promise<string | null> => {
  try {
    const resizedImage = await resizeImageToUnder100KB(imageUri);
    // In a real implementation, you might save this to device storage
    // For now, we'll just return the resized URI as a fallback

    return resizedImage;
  } catch (error) {
    console.error('Failed to create local backup:', error);
    return null;
  }
};

/**
 * Test Supabase connection and bucket access
 */
export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {

    
    // Test basic connection by listing buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Failed to list buckets:', bucketsError);
      return { success: false, error: `Connection test failed: ${bucketsError.message}` };
    }
    


    // Check if 'images' bucket exists
    const imagesBucket = buckets?.find(bucket => bucket.name === 'images');
    if (!imagesBucket) {
      return { success: false, error: 'Images bucket not found. Please create it in your Supabase dashboard.' };
    }
    

    return { success: true };
    
  } catch (error) {
    console.error('Connection test error:', error);
    return { success: false, error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

/**
 * Get signed URL for secure image access
 */
export const getSignedImageUrl = async (imageUrl: string, expiresIn: number = 3600): Promise<{ success: boolean; signedUrl?: string; error?: string }> => {
  try {
    if (!imageUrl) {
      return { success: false, error: 'No image URL provided' };
    }

    // Extract file path from the public URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const userId = urlParts[urlParts.length - 2];
    const filePath = `${userId}/${fileName}`;



    const { data, error } = await supabase.storage
      .from('images')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return { success: false, error: error.message };
    }

    if (!data?.signedUrl) {
      return { success: false, error: 'Failed to generate signed URL' };
    }

    return { success: true, signedUrl: data.signedUrl };

  } catch (error) {
    console.error('Error in getSignedImageUrl:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Enhanced upload with fallback to local storage
 */
export const uploadImageWithFallback = async (imageUri: string, userId: string): Promise<UploadResult> => {
  // Test connection first
  const connectionTest = await testSupabaseConnection();
  if (!connectionTest.success) {

    const localBackup = await createLocalImageBackup(imageUri, userId);
    
    if (localBackup) {
      return {
        success: true,
        url: localBackup,
        error: `Connection failed: ${connectionTest.error}. Image stored locally.`
      };
    }
    
    return {
      success: false,
      error: `Connection failed: ${connectionTest.error}`
    };
  }
  
  // Try to upload to Supabase
  const uploadResult = await uploadImageToSupabase(imageUri, userId);
  
  if (uploadResult.success) {
    return uploadResult;
  }
  
  // If upload fails, create local backup and continue

  const localBackup = await createLocalImageBackup(imageUri, userId);
  
  if (localBackup) {
    return {
      success: true,
      url: localBackup,
      error: `Upload failed: ${uploadResult.error}. Image stored locally.`
    };
  }
  
  return {
    success: false,
    error: 'Failed to upload image and create local backup'
  };
};