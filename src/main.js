import { boot } from './entry-router.js';

// El portal público conectado arranca sin importar el shell administrativo.
void boot(location);
