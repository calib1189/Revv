"use client";

import { GroupedList, GroupedRow, RowIcon } from "@/components/ui/grouped-list";
import { Toggle } from "@/components/ui/toggle";
import { PlayIcon, VolumeIcon, BoltIcon } from "@/components/ui/icons";
import { setDevicePreference, useDevicePreferences } from "@/lib/device-preferences";
import { useIsNative } from "@/lib/native/use-is-native";

/** Settings that apply to this device only (see device-preferences.ts):
 * how feed videos start, and haptics in the iPhone app. */
export function PlaybackSettings() {
  const preferences = useDevicePreferences();
  const isNative = useIsNative();

  return (
    <GroupedList footer="Saved on this device.">
      <GroupedRow
        label="Autoplay videos"
        detail="Videos play as soon as they're on screen"
        icon={
          <RowIcon color="#ff453a">
            <PlayIcon />
          </RowIcon>
        }
        trailing={
          <Toggle
            checked={preferences.autoplayVideos}
            onChange={(next) => setDevicePreference("autoplayVideos", next)}
            label="Autoplay videos"
          />
        }
      />
      <GroupedRow
        label="Start with sound"
        detail="Videos and photo sounds play out loud"
        icon={
          <RowIcon color="#5e5ce6">
            <VolumeIcon />
          </RowIcon>
        }
        trailing={
          <Toggle
            checked={preferences.videoSound}
            onChange={(next) => setDevicePreference("videoSound", next)}
            label="Start with sound"
          />
        }
      />
      {isNative && (
        <GroupedRow
          label="Haptics"
          detail="Small vibrations, like when your build rating lands"
          icon={
            <RowIcon color="#30b0c7">
              <BoltIcon />
            </RowIcon>
          }
          trailing={
            <Toggle
              checked={preferences.haptics}
              onChange={(next) => setDevicePreference("haptics", next)}
              label="Haptics"
            />
          }
        />
      )}
    </GroupedList>
  );
}
