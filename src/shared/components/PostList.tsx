import { useQuery } from "@tanstack/react-query";
import { Card, Text, YStack } from "tamagui";
import { User } from "../stores/user";

export default function PostList({
  usuario,
  nivel,
}: {
  usuario: User | null;
  nivel?: number;
}) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["posts"],
    queryFn: () =>
      fetch("https://jsonplaceholder.typicode.com/posts").then((res) =>
        res.json()
      ),
  });

  return (
    <YStack>
      {isPending ? (
        <Text>Cargando...</Text>
      ) : isError ? (
        <Text>Error al cargar los datos</Text>
      ) : (
        <YStack space="$2">
          {Array.isArray(data) && data.length > 0 ? (
            data.map((post: any) => (
              <Card key={post.id} p="$3" mb="$2" bordered>
                <Text fontWeight="bold">
                  {post.title} / {usuario?.nombre}
                </Text>
                <Text>{post.body}</Text>
              </Card>
            ))
          ) : (
            <Text>No hay datos para mostrar.</Text>
          )}
        </YStack>
      )}
    </YStack>
  );
}
