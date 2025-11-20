import { ConnectionRequest } from "../../models";
import mongoose from "mongoose";

export type PhotoVisibilityLevel =
  | "public"
  | "connectionOnly"
  | "adminOnly"
  | "none";

export interface PhotoWithBlur {
  url?: string;
  isBlurred?: boolean;
  title?: string;
}

export interface FilteredPhotos {
  closerPhoto: PhotoWithBlur | null;
  personalPhotos: PhotoWithBlur[];
  familyPhoto: PhotoWithBlur | null;
  otherPhotos: PhotoWithBlur[];
}

async function areUsersConnected(
  userId: mongoose.Types.ObjectId,
  otherUserId: mongoose.Types.ObjectId
): Promise<boolean> {
  try {
    const connection = await ConnectionRequest.findOne({
      $or: [
        { sender: userId, receiver: otherUserId, status: "accepted" },
        { sender: otherUserId, receiver: userId, status: "accepted" }
      ]
    }).lean();
    return !!connection;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user is admin
 */
function isAdmin(role: string): boolean {
  return role === "admin";
}

/**
 * Get filtered photos based on viewer's relationship to profile owner
 */
export async function getFilteredPhotos(
  photos: any,
  viewerId: mongoose.Types.ObjectId,
  profileOwnerId: mongoose.Types.ObjectId,
  viewerRole: string = "user",
  isBlurred: boolean = true
): Promise<FilteredPhotos> {
  const isViewerAdmin = isAdmin(viewerRole);
  const isViewingOwnProfile = viewerId.toString() === profileOwnerId.toString();
  const isConnected =
    !isViewingOwnProfile && !isViewerAdmin
      ? await areUsersConnected(viewerId, profileOwnerId)
      : false;

  return {
    closerPhoto: photos?.closerPhoto ? { url: photos.closerPhoto.url } : null,

    personalPhotos: photos?.personalPhotos
      ? photos.personalPhotos.map((photo: any) => ({
          url: photo.url,
          isBlurred: !isViewingOwnProfile && !isConnected && isBlurred
        }))
      : [],

    familyPhoto: photos?.familyPhoto
      ? {
          url: photos.familyPhoto.url,
          isBlurred: !isViewingOwnProfile && !isConnected && isBlurred
        }
      : null,

    otherPhotos: photos?.otherPhotos
      ? photos.otherPhotos.map((photo: any) => ({
          url: photo.url,
          title: photo.title,
          isBlurred: !isViewingOwnProfile && !isConnected && isBlurred
        }))
      : []
  };
}

export function getPublicPhotos(photos: any): { closerPhoto?: string } {
  return {
    closerPhoto: photos?.closerPhoto?.url
  };
}

export function getConnectionOnlyPhotosBlurred(photos: any): FilteredPhotos {
  return {
    closerPhoto: photos?.closerPhoto ? { url: photos.closerPhoto.url } : null,
    personalPhotos: photos?.personalPhotos
      ? photos.personalPhotos.map((photo: any) => ({
          url: photo.url,
          isBlurred: true
        }))
      : [],
    familyPhoto: photos?.familyPhoto
      ? {
          url: photos.familyPhoto.url,
          isBlurred: true
        }
      : null,
    otherPhotos: photos?.otherPhotos
      ? photos.otherPhotos.map((photo: any) => ({
          url: photo.url,
          title: photo.title,
          isBlurred: true
        }))
      : []
  };
}

export function getConnectionPhotosUnblurred(photos: any): FilteredPhotos {
  return {
    closerPhoto: photos?.closerPhoto ? { url: photos.closerPhoto.url } : null,
    personalPhotos: photos?.personalPhotos
      ? photos.personalPhotos.map((photo: any) => ({
          url: photo.url,
          isBlurred: false
        }))
      : [],
    familyPhoto: photos?.familyPhoto
      ? {
          url: photos.familyPhoto.url,
          isBlurred: false
        }
      : null,
    otherPhotos: photos?.otherPhotos
      ? photos.otherPhotos.map((photo: any) => ({
          url: photo.url,
          title: photo.title,
          isBlurred: false
        }))
      : []
  };
}

export function getAdminPhotos(photos: any): FilteredPhotos {
  return {
    closerPhoto: photos?.closerPhoto ? { url: photos.closerPhoto.url } : null,
    personalPhotos: photos?.personalPhotos
      ? photos.personalPhotos.map((photo: any) => ({
          url: photo.url,
          isBlurred: false
        }))
      : [],
    familyPhoto: photos?.familyPhoto
      ? {
          url: photos.familyPhoto.url,
          isBlurred: false
        }
      : null,
    otherPhotos: photos?.otherPhotos
      ? photos.otherPhotos.map((photo: any) => ({
          url: photo.url,
          title: photo.title,
          isBlurred: false
        }))
      : []
  };
}
