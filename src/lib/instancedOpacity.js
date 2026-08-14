// Shared MeshBasicMaterial patch adding a per-instance `aOpacity` attribute,
// so animated bubble/droplet swarms render as a single InstancedMesh draw
// call while keeping individual fade curves. Anchors verified in three r184.
export function patchInstanceOpacityMaterial(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aOpacity;\nvarying float vAOpacity;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAOpacity = aOpacity;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vAOpacity;')
    .replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      'vec4 diffuseColor = vec4( diffuse, opacity * vAOpacity );',
    )
}
