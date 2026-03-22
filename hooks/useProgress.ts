import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/lib/auth-context";
import type { BodyPhoto, BodyMeasurement } from "@/lib/database.types";

// Extract the file path from any Supabase storage URL format
// Handles both public URLs and previously-stored signed URLs
function extractFilePath(url: string): string | null {
  const match = url.match(/body-photos\/(.+?)(?:\?|$)/);
  return match ? match[1] : null;
}

export function useProgress() {
  const { user } = useAuthContext();
  const [photos, setPhotos] = useState<BodyPhoto[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const [photosRes, measurementsRes] = await Promise.all([
      supabase
        .from("body_photos")
        .select("*")
        .eq("user_id", user.id)
        .order("taken_at", { ascending: false }),
      supabase
        .from("body_measurements")
        .select("*")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false }),
    ]);

    if (photosRes.data && photosRes.data.length > 0) {
      // Generate fresh signed URLs so photos load regardless of bucket visibility
      const filePaths = photosRes.data
        .map((p) => extractFilePath((p as BodyPhoto).photo_url))
        .filter(Boolean) as string[];

      const { data: signedData } = await supabase.storage
        .from("body-photos")
        .createSignedUrls(filePaths, 60 * 60 * 24 * 7); // 1-week signed URLs

      const signedMap: Record<string, string> = {};
      signedData?.forEach((s) => {
        if (s.signedUrl) {
          // key is the path after "body-photos/"
          const key = s.path ?? extractFilePath(s.signedUrl) ?? "";
          signedMap[key] = s.signedUrl;
        }
      });

      const photosWithUrls = photosRes.data.map((p) => {
        const photo = p as BodyPhoto;
        const filePath = extractFilePath(photo.photo_url);
        const signedUrl = filePath ? signedMap[filePath] : undefined;
        return { ...photo, photo_url: signedUrl ?? photo.photo_url };
      });

      setPhotos(photosWithUrls);
    } else {
      setPhotos([]);
    }

    if (measurementsRes.data) setMeasurements(measurementsRes.data as BodyMeasurement[]);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addMeasurement = useCallback(
    async (data: {
      weight?: number;
      waist?: number;
      chest?: number;
      arms?: number;
      hips?: number;
    }) => {
      if (!user) return;
      await supabase.from("body_measurements").insert({
        user_id: user.id,
        weight: data.weight ?? null,
        waist: data.waist ?? null,
        chest: data.chest ?? null,
        arms: data.arms ?? null,
        hips: data.hips ?? null,
      });
      await fetchData();
    },
    [user, fetchData]
  );

  const uploadPhoto = useCallback(
    async (base64: string, angle: "front" | "side" | "back") => {
      if (!user) return;

      const fileName = `${user.id}/${Date.now()}_${angle}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("body-photos")
        .upload(fileName, decode(base64), {
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      // Use a signed URL (1 year) so it works on both public and private buckets
      const { data: signedData, error: signError } = await supabase.storage
        .from("body-photos")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);

      if (signError) throw signError;

      const photoUrl = signedData?.signedUrl;
      if (!photoUrl) throw new Error("Failed to get photo URL");

      const { error: insertError } = await supabase.from("body_photos").insert({
        user_id: user.id,
        photo_url: photoUrl,
        angle,
      });

      if (insertError) throw insertError;

      await fetchData();
    },
    [user, fetchData]
  );

  const deletePhoto = useCallback(async (photoId: string, photoUrl: string) => {
    const filePath = extractFilePath(photoUrl);
    if (filePath) {
      await supabase.storage.from("body-photos").remove([filePath]);
    }
    await supabase.from("body_photos").delete().eq("id", photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }, []);

  return {
    photos,
    measurements,
    isLoading,
    addMeasurement,
    uploadPhoto,
    deletePhoto,
    refresh: fetchData,
  };
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
