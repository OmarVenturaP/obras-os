import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Se deshabilita en dev para no interferir con la recarga en caliente
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  turbopack: {},
};

export default withPWA(nextConfig);
