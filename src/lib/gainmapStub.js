// Build-time stub for '@monogrid/gainmap-js' (aliased in vite.config.js).
// drei's useEnvironment statically imports HDRJPGLoader/GainMapLoader, but
// our only <Environment> is procedural (Lightformer children, no files/
// preset), so these loaders are unreachable. The real package costs ~15 KB
// raw in the LabViewport chunk. If HDR jpg/webp environment files are ever
// introduced, remove the alias instead of extending this stub.
class Unreachable {
  constructor() {
    throw new Error('gainmap-js is stubbed out — remove the vite alias to use HDR jpg/webp environments')
  }
}
export class HDRJPGLoader extends Unreachable {}
export class GainMapLoader extends Unreachable {}
