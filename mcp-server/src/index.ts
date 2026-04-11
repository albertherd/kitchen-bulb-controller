#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { BULBS, TEMP_MIN, TEMP_MAX } from './config.js';
import * as api from './shellyApi.js';

// Create MCP server
const server = new McpServer({
  name: 'bulb-controller',
  version: '1.0.0',
});

/**
 * Find bulb by name (case-insensitive) or IP
 */
function findBulb(identifier: string) {
  const lower = identifier.toLowerCase();
  return BULBS.find(b => 
    b.name.toLowerCase() === lower || 
    b.ip === identifier ||
    b.id === identifier
  );
}

/**
 * Clamp value to valid range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============ MCP RESOURCES ============

// Resource: Get status of all bulbs
server.resource(
  'bulbs://all/status',
  'Current status of all smart bulbs including power state, brightness, and temperature',
  async () => {
    const results = await Promise.all(
      BULBS.map(async (bulb) => {
        const status = await api.getStatus(bulb.ip);
        return {
          name: bulb.name,
          ip: bulb.ip,
          online: status.online,
          isOn: status.ison,
          brightness: status.brightness,
          temperature: status.temp,
          error: status.error,
        };
      })
    );

    return {
      contents: [{
        uri: 'bulbs://all/status',
        mimeType: 'application/json',
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);

// Resource: Get status of individual bulbs
for (const bulb of BULBS) {
  server.resource(
    `bulbs://${bulb.name.toLowerCase()}/status`,
    `Current status of the "${bulb.name}" bulb`,
    async () => {
      const status = await api.getStatus(bulb.ip);
      const result = {
        name: bulb.name,
        ip: bulb.ip,
        online: status.online,
        isOn: status.ison,
        brightness: status.brightness,
        temperature: status.temp,
        error: status.error,
      };

      return {
        contents: [{
          uri: `bulbs://${bulb.name.toLowerCase()}/status`,
          mimeType: 'application/json',
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );
}

// ============ MCP TOOLS ============

// List all bulbs with their current status
server.tool(
  'list_bulbs',
  'List all configured smart bulbs with their current status (on/off, brightness, temperature, online status)',
  {},
  async () => {
    const results = await Promise.all(
      BULBS.map(async (bulb) => {
        const status = await api.getStatus(bulb.ip);
        return {
          name: bulb.name,
          ip: bulb.ip,
          online: status.online,
          isOn: status.ison,
          brightness: status.brightness,
          temperature: status.temp,
          error: status.error,
        };
      })
    );
    
    return {
      content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
    };
  }
);

// Get status of a specific bulb
server.tool(
  'get_bulb_status',
  'Get the current status of a specific bulb by name (e.g., "Sink", "Frames", "Bieb", "Fridge")',
  {
    name: z.string().describe('Name of the bulb (e.g., "Sink", "Frames", "Bieb", "Fridge")'),
  },
  async ({ name }) => {
    const bulb = findBulb(name);
    if (!bulb) {
      return {
        content: [{ type: 'text', text: `Bulb "${name}" not found. Available: ${BULBS.map(b => b.name).join(', ')}` }],
        isError: true,
      };
    }
    
    const status = await api.getStatus(bulb.ip);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          name: bulb.name,
          ip: bulb.ip,
          online: status.online,
          isOn: status.ison,
          brightness: status.brightness,
          temperature: status.temp,
          error: status.error,
        }, null, 2),
      }],
    };
  }
);

// Turn on a bulb
server.tool(
  'turn_on_bulb',
  'Turn on a smart bulb with optional brightness (0-100) and color temperature (2700-6500 Kelvin, where 2700=warm/yellow, 6500=cool/blue)',
  {
    name: z.string().describe('Name of the bulb to turn on'),
    brightness: z.number().min(0).max(100).optional().describe('Brightness level 0-100 (default: 100)'),
    temperature: z.number().min(TEMP_MIN).max(TEMP_MAX).optional().describe('Color temperature in Kelvin, 2700=warm, 6500=cool (default: 2700)'),
  },
  async ({ name, brightness = 100, temperature = 2700 }) => {
    const bulb = findBulb(name);
    if (!bulb) {
      return {
        content: [{ type: 'text', text: `Bulb "${name}" not found. Available: ${BULBS.map(b => b.name).join(', ')}` }],
        isError: true,
      };
    }
    
    try {
      await api.turnOn(bulb.ip, clamp(brightness, 0, 100), clamp(temperature, TEMP_MIN, TEMP_MAX));
      return {
        content: [{ type: 'text', text: `✓ Turned on "${bulb.name}" at ${brightness}% brightness, ${temperature}K` }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to turn on "${bulb.name}": ${error}` }],
        isError: true,
      };
    }
  }
);

// Turn off a bulb
server.tool(
  'turn_off_bulb',
  'Turn off a smart bulb',
  {
    name: z.string().describe('Name of the bulb to turn off'),
  },
  async ({ name }) => {
    const bulb = findBulb(name);
    if (!bulb) {
      return {
        content: [{ type: 'text', text: `Bulb "${name}" not found. Available: ${BULBS.map(b => b.name).join(', ')}` }],
        isError: true,
      };
    }
    
    try {
      await api.turnOff(bulb.ip);
      return {
        content: [{ type: 'text', text: `✓ Turned off "${bulb.name}"` }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to turn off "${bulb.name}": ${error}` }],
        isError: true,
      };
    }
  }
);

// Set brightness
server.tool(
  'set_brightness',
  'Set the brightness of a bulb (0-100)',
  {
    name: z.string().describe('Name of the bulb'),
    brightness: z.number().min(0).max(100).describe('Brightness level 0-100'),
  },
  async ({ name, brightness }) => {
    const bulb = findBulb(name);
    if (!bulb) {
      return {
        content: [{ type: 'text', text: `Bulb "${name}" not found. Available: ${BULBS.map(b => b.name).join(', ')}` }],
        isError: true,
      };
    }
    
    try {
      await api.setBrightness(bulb.ip, clamp(brightness, 0, 100));
      return {
        content: [{ type: 'text', text: `✓ Set "${bulb.name}" brightness to ${brightness}%` }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to set brightness: ${error}` }],
        isError: true,
      };
    }
  }
);

// Set color temperature
server.tool(
  'set_temperature',
  'Set the color temperature of a bulb (2700-6500 Kelvin). 2700K = warm/yellow light, 6500K = cool/blue light',
  {
    name: z.string().describe('Name of the bulb'),
    temperature: z.number().min(TEMP_MIN).max(TEMP_MAX).describe('Color temperature in Kelvin (2700=warm, 6500=cool)'),
  },
  async ({ name, temperature }) => {
    const bulb = findBulb(name);
    if (!bulb) {
      return {
        content: [{ type: 'text', text: `Bulb "${name}" not found. Available: ${BULBS.map(b => b.name).join(', ')}` }],
        isError: true,
      };
    }
    
    try {
      await api.setTemperature(bulb.ip, clamp(temperature, TEMP_MIN, TEMP_MAX));
      return {
        content: [{ type: 'text', text: `✓ Set "${bulb.name}" temperature to ${temperature}K` }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to set temperature: ${error}` }],
        isError: true,
      };
    }
  }
);

// Control all bulbs at once
server.tool(
  'control_all_bulbs',
  'Control all bulbs at once - turn them all on or off with optional brightness and temperature settings',
  {
    action: z.enum(['on', 'off']).describe('Turn all bulbs "on" or "off"'),
    brightness: z.number().min(0).max(100).optional().describe('Brightness level 0-100 (only for "on" action)'),
    temperature: z.number().min(TEMP_MIN).max(TEMP_MAX).optional().describe('Color temperature in Kelvin (only for "on" action)'),
  },
  async ({ action, brightness = 100, temperature = 2700 }) => {
    const results: string[] = [];
    
    for (const bulb of BULBS) {
      try {
        if (action === 'on') {
          await api.turnOn(bulb.ip, clamp(brightness, 0, 100), clamp(temperature, TEMP_MIN, TEMP_MAX));
          results.push(`✓ ${bulb.name}: on`);
        } else {
          await api.turnOff(bulb.ip);
          results.push(`✓ ${bulb.name}: off`);
        }
      } catch (error) {
        results.push(`✗ ${bulb.name}: failed - ${error}`);
      }
    }
    
    return {
      content: [{ type: 'text', text: results.join('\n') }],
    };
  }
);

// ============ START SERVER ============

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Bulb Controller MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
