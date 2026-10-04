import { Text, View } from 'react-native';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-white px-6">
      <Text className="text-2xl font-bold text-pitch-dark">{title}</Text>
      <Text className="text-center text-base text-gray-500">{description}</Text>
    </View>
  );
}
