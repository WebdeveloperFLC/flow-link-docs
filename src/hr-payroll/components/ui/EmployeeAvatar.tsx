import { useQuery } from "@tanstack/react-query";
import { getHrDocumentSignedUrl } from "../../lib/hrStorage";
import { initials } from "../../lib/format";

type Props = {
  name: string;
  photoUrl?: string | null;
  size?: number;
  fontSize?: number;
};

export function EmployeeAvatar({ name, photoUrl, size = 56, fontSize }: Props) {
  const fs = fontSize ?? Math.round(size * 0.34);

  const { data: src } = useQuery({
    queryKey: ["hr-employee-photo", photoUrl],
    enabled: !!photoUrl,
    queryFn: () => getHrDocumentSignedUrl(photoUrl!),
    staleTime: 45 * 60 * 1000,
  });

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="avatar"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: fs }}>
      {initials(name)}
    </div>
  );
}
