import C from "typegpu";
import * as o from "typegpu/data";
import * as u from "typegpu/std";
const g = (globalThis.__TYPEGPU_AUTONAME__ ?? ((t) => t))(
  C.bindGroupLayout({
    externalTexture: { externalTexture: o.textureExternal() },
  }),
  "bindGroupLayout",
);
function S(t, d, n, r, s, c, p) {
  return C["~unstable"].fragmentFn({
    in: { uv: o.vec2f },
    out: o.vec4f,
  })(
    ((x) =>
      (globalThis.__TYPEGPU_META__ ??= /* @__PURE__ */ new WeakMap()).set(
        (x.f = (P) => {
          "use gpu";
          const a = d.$,
            l = P.uv.mul(o.vec2f(a.x, a.y)),
            v = o.u32(l.x) % 3,
            y = o.u32(l.y) % 3,
            f = u.select(v, y, r.$ === 1),
            b = l.div(3),
            m = o.f32(s.$),
            w = u
              .floor(b)
              .mul(m)
              .add(m / 2),
            $ = o.vec2f(n.$.x, n.$.y),
            k = w.div($),
            e = u.textureSampleBaseClampToEdge(g.$.externalTexture, t.$, k);
          if (c.$ === 1) {
            const I = o.u32(l.y) / 3,
              T = o.u32(I) % 2,
              D = o.u32(p.$);
            if (T !== D) return o.vec4f(0, 0, 0, 1);
          }
          let i = e;
          return (
            f === 0
              ? (i = o.vec4f(e.x, 0, 0, e.w))
              : f === 1
                ? (i = o.vec4f(0, e.y, 0, e.w))
                : (i = o.vec4f(0, 0, e.z, e.w)),
            i
          );
        }),
        {
          v: 1,
          name: void 0,
          ast: {
            params: [{ type: "i", name: "input" }],
            body: [
              0,
              [
                [13, "outputDims", [7, "outputDimensions", "$"]],
                [
                  13,
                  "pixelCoord",
                  [
                    6,
                    [7, [7, "input", "uv"], "mul"],
                    [
                      [
                        6,
                        [7, "d", "vec2f"],
                        [
                          [7, "outputDims", "x"],
                          [7, "outputDims", "y"],
                        ],
                      ],
                    ],
                  ],
                ],
                [
                  13,
                  "blockX",
                  [
                    1,
                    [6, [7, "d", "u32"], [[7, "pixelCoord", "x"]]],
                    "%",
                    [5, "3"],
                  ],
                ],
                [
                  13,
                  "blockY",
                  [
                    1,
                    [6, [7, "d", "u32"], [[7, "pixelCoord", "y"]]],
                    "%",
                    [5, "3"],
                  ],
                ],
                [
                  13,
                  "blockPos",
                  [
                    6,
                    [7, "std", "select"],
                    [
                      "blockX",
                      "blockY",
                      [1, [7, "orientation", "$"], "==", [5, "1"]],
                    ],
                  ],
                ],
                [
                  13,
                  "logicalPixelCoord",
                  [6, [7, "pixelCoord", "div"], [[5, "3"]]],
                ],
                [
                  13,
                  "density",
                  [6, [7, "d", "f32"], [[7, "pixelDensity", "$"]]],
                ],
                [
                  13,
                  "logicalPixelIndex",
                  [6, [7, "std", "floor"], ["logicalPixelCoord"]],
                ],
                [
                  13,
                  "groupedPixel",
                  [
                    6,
                    [
                      7,
                      [6, [7, "logicalPixelIndex", "mul"], ["density"]],
                      "add",
                    ],
                    [[1, "density", "/", [5, "2"]]],
                  ],
                ],
                [
                  13,
                  "inputDims",
                  [
                    6,
                    [7, "d", "vec2f"],
                    [
                      [7, [7, "inputDimensions", "$"], "x"],
                      [7, [7, "inputDimensions", "$"], "y"],
                    ],
                  ],
                ],
                [13, "inputUV", [6, [7, "groupedPixel", "div"], ["inputDims"]]],
                [
                  13,
                  "inputColor",
                  [
                    6,
                    [7, "std", "textureSampleBaseClampToEdge"],
                    [
                      [7, [7, "bindGroupLayout", "$"], "externalTexture"],
                      [7, "sampler", "$"],
                      "inputUV",
                    ],
                  ],
                ],
                [
                  13,
                  "isInterlaced",
                  [1, [7, "interlaced", "$"], "==", [5, "1"]],
                ],
                [
                  11,
                  "isInterlaced",
                  [
                    0,
                    [
                      [
                        13,
                        "outputY",
                        [6, [7, "d", "u32"], [[7, "pixelCoord", "y"]]],
                      ],
                      [13, "logicalPixelRow", [1, "outputY", "/", [5, "3"]]],
                      [
                        13,
                        "logicalPixelRowIndex",
                        [6, [7, "d", "u32"], ["logicalPixelRow"]],
                      ],
                      [
                        13,
                        "pixelRowField",
                        [1, "logicalPixelRowIndex", "%", [5, "2"]],
                      ],
                      [
                        13,
                        "selectedField",
                        [6, [7, "d", "u32"], [[7, "field", "$"]]],
                      ],
                      [
                        13,
                        "shouldSkip",
                        [1, "pixelRowField", "!=", "selectedField"],
                      ],
                      [
                        11,
                        "shouldSkip",
                        [
                          0,
                          [
                            [
                              10,
                              [
                                6,
                                [7, "d", "vec4f"],
                                [
                                  [5, "0"],
                                  [5, "0"],
                                  [5, "0"],
                                  [5, "1"],
                                ],
                              ],
                            ],
                          ],
                        ],
                      ],
                    ],
                  ],
                ],
                [12, "outputColor", "inputColor"],
                [
                  11,
                  [1, "blockPos", "==", [5, "0"]],
                  [
                    0,
                    [
                      [
                        2,
                        "outputColor",
                        "=",
                        [
                          6,
                          [7, "d", "vec4f"],
                          [
                            [7, "inputColor", "x"],
                            [5, "0"],
                            [5, "0"],
                            [7, "inputColor", "w"],
                          ],
                        ],
                      ],
                    ],
                  ],
                  [
                    11,
                    [1, "blockPos", "==", [5, "1"]],
                    [
                      0,
                      [
                        [
                          2,
                          "outputColor",
                          "=",
                          [
                            6,
                            [7, "d", "vec4f"],
                            [
                              [5, "0"],
                              [7, "inputColor", "y"],
                              [5, "0"],
                              [7, "inputColor", "w"],
                            ],
                          ],
                        ],
                      ],
                    ],
                    [
                      0,
                      [
                        [
                          2,
                          "outputColor",
                          "=",
                          [
                            6,
                            [7, "d", "vec4f"],
                            [
                              [5, "0"],
                              [5, "0"],
                              [7, "inputColor", "z"],
                              [7, "inputColor", "w"],
                            ],
                          ],
                        ],
                      ],
                    ],
                  ],
                ],
                [10, "outputColor"],
              ],
            ],
            externalNames: [
              "outputDimensions",
              "d",
              "std",
              "orientation",
              "pixelDensity",
              "inputDimensions",
              "bindGroupLayout",
              "sampler",
              "interlaced",
              "field",
            ],
          },
          get externals() {
            return {
              outputDimensions: d,
              d: o,
              std: u,
              orientation: r,
              pixelDensity: s,
              inputDimensions: n,
              bindGroupLayout: g,
              sampler: t,
              interlaced: c,
              field: p,
            };
          },
        },
      ) && x.f)({}),
  );
}
export { g as bindGroupLayout, S as createSubpixelFragment };
//# sourceMappingURL=subpixel-fragment.js.map
