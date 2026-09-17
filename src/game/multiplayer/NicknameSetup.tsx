import { useState } from "react";
import { AVATAR_KEYS, AVATARS, type AvatarKey } from "./avatars";
import { saveIdentity, type PlayerIdentity } from "../storage";

type Props = {
  initial?: PlayerIdentity | null;
  onDone: (id: PlayerIdentity) => void;
  onCancel?: () => void;
};

export function NicknameSetup({ initial, onDone, onCancel }: Props) {
  const [name, setName] = useState(initial?.nickname ?? "");
  const [avatar, setAvatar] = useState<AvatarKey>(
    (initial?.avatar as AvatarKey) ?? "av1",
  );
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setErr("APELIDO PRECISA DE 2+ LETRAS");
      return;
    }
    if (trimmed.length > 18) {
      setErr("APELIDO MUITO GRANDE (MAX 18)");
      return;
    }
    const id = saveIdentity(trimmed, avatar);
    onDone(id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-arcade-dark/90 flex items-center justify-center p-4">
      <div className="bg-arcade-cream text-arcade-dark border-4 border-arcade-dark rounded-md shadow-arcade max-w-md w-full p-5">
        <div className="font-arcade text-lg text-arcade-red mb-1 text-center">
          QUEM É VOCÊ?
        </div>
        <div className="font-body text-xs text-arcade-dark/80 text-center mb-4">
          Sem cadastro. Fica salvo só no seu navegador.
        </div>

        <label className="font-arcade text-[10px] text-arcade-dark block mb-2">
          APELIDO
        </label>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErr(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          maxLength={18}
          placeholder="Ex: RONIELDO"
          className="w-full font-arcade text-sm px-3 py-3 bg-arcade-cream text-arcade-dark border-4 border-arcade-dark focus:border-arcade-red outline-none uppercase tracking-wider"
        />

        <div className="font-arcade text-[10px] text-arcade-dark block mt-4 mb-2">
          ESCOLHA SEU AVATAR
        </div>
        <div className="grid grid-cols-4 gap-2">
          {AVATAR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setAvatar(key)}
              className={`aspect-square border-4 p-1 bg-arcade-cream transition-transform ${
                avatar === key
                  ? "border-arcade-red scale-105"
                  : "border-arcade-dark hover:border-arcade-yellow"
              }`}
            >
              <img
                src={AVATARS[key]}
                alt={`Avatar ${key}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>

        {err && (
          <div className="mt-3 font-arcade text-[10px] text-arcade-red text-center">
            {err}
          </div>
        )}

        <div className="mt-5 flex gap-2 justify-end">
          {onCancel && (
            <button
              onClick={onCancel}
              className="font-arcade text-[10px] px-3 py-2 bg-arcade-cream text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-yellow"
            >
              ← VOLTAR
            </button>
          )}
          <button
            onClick={submit}
            className="font-arcade text-xs px-5 py-3 bg-arcade-red text-arcade-cream border-2 border-arcade-dark hover:bg-arcade-dark"
          >
            CONFIRMAR
          </button>
        </div>
      </div>
    </div>
  );
}
