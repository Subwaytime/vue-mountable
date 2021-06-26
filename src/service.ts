import { h, inject, mergeProps, render, Teleport } from 'vue';
import { empty, isVueComponent, toArray } from './utils';
import { MODULE_NAME } from './constant';

import type { App, RendererElement, VNode } from 'vue';
import type { Component, RawSlots, MountOptions } from './types';

let MountableServiceSymbol: Symbol = Symbol(),
	container: RendererElement,
	node: VNode,
	instance: any;

/**
 * Will inject Mount and Destroy into `setup`
 * const { mount, destroy } = useComponent()
 * @returns
 */

export function useComponent() {
	const service = inject(MountableServiceSymbol);

	if(!service) {
		throw new Error(`[${MODULE_NAME}]: No Mountable Service provided!`);
	}

	return service;
}

/**
 * Mount a Component to the current Vue or Component Instance
 * Can hold Props, Children Components and a teleportation Target
 * @param component
 * @param param1
 */

function mount(component: Component, { props, children, target = '' }: MountOptions) {
	if (!component.name) {
		throw new Error('Component Name is not defined.');
	}

	container = document.createDocumentFragment();

	if (component.props && component.props.target) {
		target = (component.props.target instanceof String ? component.props.target : component.props.target.default);
	}

	const defaultProps = {
		programmatic: {
			type: Boolean,
			default: true,
		}
	};

	let vnode: VNode;
	const data = mergeProps(defaultProps, props);
	component.inheritAttrs = false;

	const childComponents: RawSlots = toArray(children).reduce((result:any, child:any) => {
		if(isVueComponent(child)) {
			child.component = {};
			for (const key of Object.keys(child)) {
				child.component[key] = child[key];
				if(key != 'component') {
					delete child[key];
				}
			}
		}

		if(!child.slot) {
			child.slot = 'default';
		}

		if(result[child.slot]) {
			return {
				...result,
				[child['slot']]: () => [result[child.slot](), h(child.component, child.props)]
			}
		} else {
			return {
				...result,
				[child['slot']]: () => h(child.component, child.props)
			};
		}

	}, {});

	if(!empty(childComponents)) {
		vnode = h(component, data, childComponents);
	} else {
		vnode = h(component, data);
	}

	// set current instance
	vnode.appContext = instance._context;

	// save the vnode before teleportation
	node = vnode;

	if (!empty(target)) {
		const teleporter = h(Teleport as any, { to: target });
		vnode = h(teleporter, vnode);
	}

	render(vnode, container as Element);
	instance._container.appendChild(container);
	return node;
}

/**
 * Remove an Element from DOM
 * @param element
 */

function destroy(element: HTMLElement) {
	if (typeof element.remove !== 'undefined') {
		element.remove();
	} else {
		element.parentNode && element.parentNode.removeChild(element);
	}
	render(null, element);
}

export const VueMountable = {
	mount,
	destroy,
	install(app: App) {
		instance = app;
		const mountable = this;
		app.config.globalProperties.$useComponent = mountable;
		app.provide(MountableServiceSymbol, mountable);
	}
};