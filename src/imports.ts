/// <reference path="../../stardazed/dist/stardazed.d.ts" />

import io = sd.io;
import asset = sd.asset;
import image = sd.image;
import math = sd.math;
import entity = sd.entity;
import render = sd.render;
import geometry = sd.geometry;
import dom = sd.dom;
import container = sd.container;
import audio = sd.audio;
import physics = sd.physics;
import control = sd.control;
import effect = render.effect;

const { vec2, vec3, vec4, quat, mat3, mat4 } = veclib;

interface Element {
	mozRequestFullScreen(): void;
}

interface Document {
	mozFullScreenElement: HTMLElement;
}

