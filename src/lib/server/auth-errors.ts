type ProviderError = { code?: string; status?: number };
type AuthAction = "login" | "register";

export function authFailure(error: ProviderError, action: AuthAction) {
  const code = error.code;
  if (code === "email_address_invalid")
    return {
      status: 422,
      code,
      field: "email",
      error:
        "Alamat email ini belum dapat digunakan. Periksa ejaannya dan gunakan email aktif yang bisa menerima pesan.",
    };
  if (code === "weak_password")
    return {
      status: 422,
      code,
      field: "password",
      error:
        "Kata sandi belum cukup kuat. Gunakan kombinasi huruf besar, huruf kecil, angka, dan simbol; hindari kata sandi yang umum.",
    };
  if (code === "email_not_confirmed")
    return {
      status: 401,
      code,
      field: "email",
      error:
        "Email belum dikonfirmasi. Buka tautan konfirmasi di kotak masuk atau folder spam, lalu masuk kembali.",
    };
  if (code === "email_address_not_authorized")
    return {
      status: 503,
      code: "registration_email_unavailable",
      error:
        "Layanan email pendaftaran sekolah belum siap menerima alamat ini. Hubungi guru atau pengelola untuk melanjutkan pendaftaran.",
    };
  if (code === "signup_disabled" || code === "email_provider_disabled")
    return {
      status: 503,
      code: "registration_unavailable",
      error:
        "Pendaftaran akun sedang belum dibuka. Hubungi guru atau pengelola sekolah.",
    };
  if (code === "over_email_send_rate_limit")
    return {
      status: 429,
      code,
      error:
        "Pengiriman email konfirmasi sedang dibatasi. Tunggu beberapa saat sebelum mencoba kembali. Jika berlanjut, hubungi pengelola sekolah.",
    };
  if (error.status === 429 || code === "over_request_rate_limit")
    return {
      status: 429,
      code: "auth_rate_limited",
      error: "Terlalu banyak percobaan. Tunggu beberapa saat, lalu coba lagi.",
    };
  if (action === "login" && code === "invalid_credentials")
    return {
      status: 401,
      code,
      error:
        "Email atau kata sandi belum sesuai. Periksa kembali, lalu coba masuk.",
    };
  return {
    status: 503,
    code: "auth_unavailable",
    error:
      action === "register"
        ? "Pendaftaran belum dapat dilayani saat ini. Coba lagi nanti atau hubungi pengelola sekolah."
        : "Layanan masuk sedang tidak tersedia. Coba lagi nanti atau hubungi pengelola sekolah.",
  };
}

export const registrationMessage =
  "Jika pendaftaran diterima, tautan konfirmasi dikirim ke email yang kamu gunakan. Periksa kotak masuk dan folder spam. Jika sudah memiliki akun, silakan masuk.";

export function isExistingRegistration(error: ProviderError) {
  return ["user_already_exists", "email_exists"].includes(error.code ?? "");
}
