import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { isLightKit } from '@/domain/colors';

/**
 * The kit worn, as a small shirt in its color: a bare colored dot read like a status light (a
 * red dot next to a result looked like "loss"). The white disc keeps dark kits visible on dark
 * headers; kits too faint for it (white, yellow, sky blue, grey) get a grey outline over the
 * colored shirt, so the color still shows. Decorative: say the kit in the parent's label.
 */
export function KitShirt({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <View
      accessible={false}
      // Hidden from screen readers on both platforms (accessible={false} alone isn't on Android).
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className="rounded-full bg-white p-0.5"
    >
      <View style={{ width: size, height: size }}>
        <Ionicons name="shirt" size={size} color={color} />
        {isLightKit(color) && (
          <Ionicons
            name="shirt-outline"
            size={size}
            color="#6b7280"
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        )}
      </View>
    </View>
  );
}
