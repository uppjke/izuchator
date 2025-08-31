import type { NextConfig } from "next";
import { networkInterfaces } from "os";

// Получаем все локальные IP адреса для development
function getAllowedOrigins(): string[] {
  const baseOrigins = ['localhost', '127.0.0.1'];
  
  // В production возвращаем только базовые
  if (process.env.NODE_ENV === 'production') {
    return baseOrigins;
  }
  
  // В development добавляем все локальные IP
  try {
    const nets = networkInterfaces();
    const localIPs: string[] = [];
    
    for (const name of Object.keys(nets)) {
      const netInterface = nets[name];
      if (netInterface) {
        for (const net of netInterface) {
          // Добавляем только IPv4 адреса, исключая loopback
          if (net.family === 'IPv4' && !net.internal) {
            localIPs.push(net.address);
          }
        }
      }
    }
    
    console.log(`🌐 Allowed origins: ${[...baseOrigins, ...localIPs].join(', ')}`);
    return [...baseOrigins, ...localIPs];
  } catch (error) {
    console.warn('⚠️  Could not detect network interfaces, using defaults');
    return baseOrigins;
  }
}

const nextConfig: NextConfig = {
  // Автоматически определяем разрешённые origins
  allowedDevOrigins: getAllowedOrigins(),
};

export default nextConfig;
